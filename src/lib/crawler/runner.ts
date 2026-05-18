import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeZvgLand, scrapeZvgDetail } from "./scraper";
import { ensureDocsBucket, downloadPropertyDocuments } from "./documents";
import { BUNDESLAENDER } from "@/lib/utils/bundeslaender";
import { getCrawlerProgress, setCrawlerProgress, resetCrawlerProgress, sendControlSignal } from "./state";
import { sendSearchAlertNotification, sendCrawlerErrorNotification } from "@/lib/email";
import type { CrawlerRunResult, ZvgEntry } from "./types";
import type { Property, SearchAlert } from "@/lib/types/database";

export { getCrawlerProgress, resetCrawlerProgress };

const RATE_LIMIT_MS = 2_000;    // 2 Sekunden zwischen Bundeslaender-Requests
const UPSERT_BATCH_SIZE = 20;   // Eintraege pro Supabase-Batch-Request (20 statt 50 - robuster)
const BATCH_PAUSE_MS = 800;     // Pause zwischen Batch-Upserts (800ms - schuetzt Supabase)
const DETAIL_CONCURRENCY = 3;   // Parallele Detail-Page-Requests (3 statt 5, robuster gegen Rate-Limits)
const DETAIL_PAUSE_MS = 500;    // Pause zwischen Detail-Batches (500ms, schonender fuer ZVG-Portal)
const UPSERT_MAX_RETRIES = 3;   // Max. Wiederholungsversuche bei Supabase-Netzwerkfehler

/**
 * Wenn CRAWLER_SKIP_ENRICHMENT=true gesetzt ist, werden Detail-Seiten und
 * Dokument-Downloads uebersprungen. Nur die schnelle Listen-Scrape aller 16
 * Bundeslaender wird ausgefuehrt (~3-4 Min. statt 19+ Min.).
 *
 * Vercel Pro: maxDuration=300s - ohne dieses Flag wird die Funktion immer
 * gekillt bevor updateCrawlerRun() aufgerufen werden kann.
 * Lokal / Cron mit laengerer Laufzeit: Flag weglassen fuer vollen Lauf.
 */
const SKIP_ENRICHMENT = process.env.CRAWLER_SKIP_ENRICHMENT === "true";

/**
 * Berechnet das dynamische Zeitlimit fuer das Detail-Enrichment eines Bundeslandes.
 * Groessere Laender (z.B. NW mit 460 Objekten) bekommen proportional mehr Zeit.
 * Formel: max(5 Min, ceil(entries / 30)) - ca. 2 Sek. pro Objekt bei Concurrency=3
 */
function calcDetailMaxMs(entryCount: number): number {
  const minutesNeeded = Math.max(5, Math.ceil(entryCount / 30));
  return minutesNeeded * 60 * 1_000;
}

/**
 * Gibt den Event-Loop frei. Wichtig: Der Crawler laeuft auf demselben Node.js-Thread
 * wie der Next.js-Server. Ohne setImmediate-Yields koennen andere HTTP-Requests
 * warten bis der Crawler fertig ist (schlechte UX).
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upserted mehrere Eintraege in einem einzigen Supabase-Request.
 * Bei Netzwerkfehler: bis zu UPSERT_MAX_RETRIES Wiederholungen mit Backoff.
 * Bei anhaltendem Fehler: rekursive Halbierung des Batches (divide-and-conquer).
 */
async function upsertBatch(
  admin: ReturnType<typeof createAdminClient>,
  entries: ZvgEntry[],
  attempt = 1
): Promise<{ inserted: number; skipped: number }> {
  // Rekursive Halbierung nach erschoepften Retries (divide-and-conquer)
  if (entries.length > 1 && attempt > UPSERT_MAX_RETRIES) {
    const mid = Math.ceil(entries.length / 2);
    console.warn(`[Crawler] Teile Batch auf: ${entries.length} -> 2x ${mid}`);
    const left = await upsertBatch(admin, entries.slice(0, mid), 1);
    const right = await upsertBatch(admin, entries.slice(mid), 1);
    return { inserted: left.inserted + right.inserted, skipped: left.skipped + right.skipped };
  }

  const now = new Date().toISOString();
  const rows = entries.map((entry) => ({
    zvg_id: entry.zvg_id,
    court: entry.amtsgericht,
    court_file_number: entry.aktenzeichen,
    auction_date: entry.termin?.toISOString() ?? null,
    property_type: entry.property_type,
    address: entry.adresse,
    city: entry.ort,
    zip_code: entry.plz ?? "00000",
    state: entry.state,
    land_abk: entry.land_abk,
    objekt_lage: entry.objekt_lage,
    market_value: entry.verkehrswert_eur,
    minimum_bid: entry.verkehrswert_eur
      ? Math.round(entry.verkehrswert_eur * 0.5)
      : null,
    document_urls: entry.document_urls,
    status: "active",
    last_crawled_at: now,
  }));

  const { error } = await admin
    .from("properties")
    .upsert(rows, { onConflict: "zvg_id", ignoreDuplicates: false });

  if (error) {
    if (attempt <= UPSERT_MAX_RETRIES) {
      const waitMs = attempt * 2_000;
      console.warn(
        `[Crawler] Batch-Upsert Versuch ${attempt}/${UPSERT_MAX_RETRIES} fehlgeschlagen ` +
        `(${entries.length} Eintraege): ${error.message} - warte ${waitMs}ms...`
      );
      await sleep(waitMs);
      return upsertBatch(admin, entries, attempt + 1);
    }
    // Einzelner Eintrag schlaegt fehl -> als skipped zaehlen
    if (entries.length === 1) {
      console.error(`[Crawler] Einzel-Upsert dauerhaft fehlgeschlagen: ${entries[0].zvg_id}`);
      return { inserted: 0, skipped: 1 };
    }
    // Mehrere Eintraege -> bereits in rekursiver Halbierung (sollte nicht erreicht werden)
    console.error(
      `[Crawler] Batch-Upsert dauerhaft fehlgeschlagen (${entries.length} Eintraege):`,
      error.message
    );
    return { inserted: 0, skipped: entries.length };
  }

  return { inserted: entries.length, skipped: 0 };
}

async function updateCrawlerRun(
  admin: ReturnType<typeof createAdminClient>,
  runId: string,
  result: Omit<CrawlerRunResult, "run_id">
) {
  await admin
    .from("crawler_runs")
    .update({
      status: result.errors > result.scraped * 0.5 ? "failed" : "completed",
      finished_at: new Date().toISOString(),
      new_properties_count: result.inserted,
      updated_properties_count: result.scraped - result.inserted,
      error_message:
        result.errors > 0
          ? `${result.errors} Fehler waehrend des Laufs`
          : null,
    })
    .eq("id", runId);
}

/**
 * Holt einmalig einen PHPSESSID-Cookie vom ZVG-Portal-Suchformular.
 * Dieser Cookie ist noetig damit Detailseiten vollstaendige Daten liefern.
 */
async function getZvgSessionCookie(): Promise<string> {
  try {
    const resp = await fetch(
      "https://www.zvg-portal.de/index.php?button=Termine%20suchen",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Auktivo/1.0; +https://auktivo.de)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "de-DE,de;q=0.9",
        },
      }
    );
    const rawCookie = resp.headers.get("set-cookie") ?? "";
    const match = /PHPSESSID=[^;,\s]+/.exec(rawCookie);
    if (match) {
      console.log("[Crawler] ZVG PHP-Session etabliert:", match[0].slice(0, 18) + "...");
      return match[0];
    }
  } catch (err) {
    console.warn("[Crawler] Kein ZVG-Session-Cookie erhalten:", err instanceof Error ? err.message : String(err));
  }
  return "";
}

/**
 * Holt Detail-Daten (Dokumente, Grundbuch, Beschreibung, etc.) fuer alle
 * Eintraege eines Bundeslandes. Laeuft parallel mit max. DETAIL_CONCURRENCY
 * gleichzeitigen Requests, um das ZVG-Portal nicht zu ueberlasten.
 * Bricht ab nach DETAIL_MAX_MINUTES oder bei Abort-Signal.
 */
async function enrichWithDetails(
  admin: ReturnType<typeof createAdminClient>,
  entries: ZvgEntry[]
): Promise<void> {
  console.log(`[Crawler] Starte Detail-Enrichment fuer ${entries.length} Eintraege...`);
  // Session-Cookie einmalig holen - alle Detail-Requests und PDF-Downloads nutzen dieselbe Session
  const sessionCookie = await getZvgSessionCookie();
  // Storage-Bucket sicherstellen (idempotent - ignoriert "already exists")
  await ensureDocsBucket(admin);
  const maxMs = calcDetailMaxMs(entries.length);
  const deadline = Date.now() + maxMs;
  const maxMinutes = Math.round(maxMs / 60_000);

  let enrichedCount = 0;

  for (let i = 0; i < entries.length; i += DETAIL_CONCURRENCY) {
    // Zeitlimit und Abort-Signal pruefen
    if (getCrawlerProgress().controlSignal === "abort") break;
    if (Date.now() > deadline) {
      console.warn(
        `[Crawler] Detail-Enrichment nach ${maxMinutes} Min. abgebrochen ` +
        `(${i}/${entries.length} verarbeitet)`
      );
      break;
    }

    const batch = entries.slice(i, i + DETAIL_CONCURRENCY);

    await Promise.all(
      batch.map(async (entry) => {
        try {
          const detail = await scrapeZvgDetail(entry.zvg_id_numeric, entry.land_abk, sessionCookie);

          // Nur Felder updaten die tatsaechlich Daten haben
          // document_urls und auction_date nur ueberschreiben wenn Detail-Seite etwas liefert
          const updateFields: Record<string, unknown> = {
            art_versteigerung: detail.art_versteigerung,
            grundbuch: detail.grundbuch,
            beschreibung: detail.beschreibung,
            versteigerungsort: detail.versteigerungsort,
            glaeubigerinfo: detail.glaeubigerinfo,
            geoserver_url: detail.geoserver_url,
          };
          if (detail.document_urls.length > 0) {
            updateFields.document_urls = detail.document_urls;
          }
          // auction_date: Detail-Seite hat praezisere Uhrzeit - nur ueberschreiben wenn gefunden
          if (detail.termin) {
            updateFields.auction_date = detail.termin.toISOString();
          }

          await admin
            .from("properties")
            .update(updateFields)
            .eq("zvg_id", entry.zvg_id);

          // Dokumente herunterladen, KI-lesbar aufbereiten und dauerhaft speichern
          if (detail.document_urls.length > 0) {
            const { data: prop } = await admin
              .from("properties")
              .select("id")
              .eq("zvg_id", entry.zvg_id)
              .single();

            if (prop?.id) {
              // Zuerst Basis-Eintraege anlegen (ignoriert bereits vorhandene - Idempotenz)
              await admin.from("property_documents").upsert(
                detail.document_urls.map((url) => ({
                  property_id: prop.id,
                  original_url: url,
                  ocr_status: "pending" as const,
                })),
                { onConflict: "property_id,original_url", ignoreDuplicates: true }
              );

              // PDFs herunterladen, in Storage speichern und OCR-Text extrahieren
              const { stored, failed } = await downloadPropertyDocuments(
                prop.id,
                detail.document_urls,
                sessionCookie,
                admin
              );

              if (stored > 0) {
                console.log(
                  `[Crawler] ${entry.zvg_id}: ${stored} Dokument(e) gespeichert` +
                  (failed > 0 ? `, ${failed} fehlgeschlagen` : "")
                );
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[Crawler] Detail-Fehler ${entry.zvg_id}:`, msg);
        } finally {
          enrichedCount++;
        }
      })
    );

    // Fortschritt nach jedem Batch aktualisieren
    setCrawlerProgress({ currentLandEnriched: enrichedCount });

    if (i + DETAIL_CONCURRENCY < entries.length) {
      await sleep(DETAIL_PAUSE_MS);
    }
    await yieldToEventLoop();
  }

  console.log(`[Crawler] Detail-Enrichment abgeschlossen (${enrichedCount}/${entries.length})`);
}

/**
 * Prueft alle aktiven Suchalarme gegen neu eingefuegte Properties und
 * schickt E-Mail-Benachrichtigungen fuer Treffer.
 */
async function notifySearchAlerts(
  admin: ReturnType<typeof createAdminClient>,
  newZvgIds: string[]
): Promise<void> {
  if (!newZvgIds.length) return;

  // Neu eingefuegte Properties laden
  const { data: newProps, error: propErr } = await admin
    .from("properties")
    .select("*")
    .in("zvg_id", newZvgIds)
    .eq("status", "active");

  if (propErr || !newProps?.length) return;

  // Alle aktiven Alarme mit E-Mail-Benachrichtigung laden (inkl. User-E-Mail)
  const { data: alerts, error: alertErr } = await admin
    .from("search_alerts")
    .select("*, profiles(email, email_notifications)")
    .eq("is_active", true)
    .eq("notification_email", true);

  if (alertErr || !alerts?.length) return;

  for (const alert of alerts) {
    const profile = (alert as SearchAlert & { profiles: { email: string; email_notifications: boolean } | null }).profiles;
    if (!profile?.email || !profile.email_notifications) continue;

    const matches = (newProps as Property[]).filter((p) => {
      // PLZ-Matching: mindestens erste 2 Stellen uebereinstimmen (Leitregion)
      const zipMatch =
        !alert.zip_codes?.length ||
        alert.zip_codes.some(
          (z: string) => p.zip_code.startsWith(z.slice(0, 2))
        );

      // Objekttyp-Matching (leer = alle Typen)
      const typeMatch =
        !alert.property_types?.length ||
        alert.property_types.includes(p.property_type ?? "");

      // Wertgrenzen
      const minMatch =
        alert.min_market_value == null ||
        (p.market_value != null && p.market_value >= alert.min_market_value);
      const maxMatch =
        alert.max_market_value == null ||
        (p.market_value != null && p.market_value <= alert.max_market_value);

      return zipMatch && typeMatch && minMatch && maxMatch;
    });

    if (!matches.length) continue;

    try {
      await sendSearchAlertNotification({
        to: profile.email,
        alert: { id: alert.id, name: alert.name },
        properties: matches,
      });

      // last_triggered_at aktualisieren
      await admin
        .from("search_alerts")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", alert.id);

      console.log(`[Crawler] Suchalarm "${alert.name}" → ${matches.length} Treffer an ${profile.email}`);
    } catch (err) {
      console.error("[Crawler] Suchalarm-E-Mail fehlgeschlagen:", err instanceof Error ? err.message : err);
    }
  }
}

/**
 * Fuehrt einen vollstaendigen Crawler-Lauf durch:
 * 1. Erstellt einen crawler_runs-Eintrag
 * 2. Scraped alle 16 Bundeslaender nacheinander (rate-limited)
 * 3. Speichert Objekte via upsert in properties
 * 4. Schliesst den crawler_runs-Eintrag ab
 *
 * @param options.skipEnrichment  Wenn true: kein Detail-Enrichment (nur Listen-Scrape).
 *   Empfohlen fuer Vercel-Trigger - Enrichment laeuft dann via /api/crawler/enrich weiter.
 */
export async function runCrawler(options?: { skipEnrichment?: boolean }): Promise<CrawlerRunResult> {
  const skipEnrichment = options?.skipEnrichment ?? SKIP_ENRICHMENT;
  // Bereits laufend? Nicht doppelt starten
  if (getCrawlerProgress().phase === "running") {
    console.warn("[Crawler] Laeuft bereits - ignoriere doppelten Start");
    return { run_id: "", scraped: 0, inserted: 0, skipped: 0, errors: 0, duration_ms: 0 };
  }

  resetCrawlerProgress();
  const startTime = Date.now();
  const admin = createAdminClient();
  let runId = "";

  console.log("[Crawler] Starte ZVG-Portal-Crawler...");

  // Crawler-Lauf anlegen
  const { data: run, error: runError } = await admin
    .from("crawler_runs")
    .insert({
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (runError || !run) {
    console.error("[Crawler] Konnte crawler_run nicht anlegen:", runError?.message);
    setCrawlerProgress({ phase: "error", lastError: runError?.message ?? "DB-Fehler", finishedAt: new Date().toISOString() });
    return {
      run_id: "",
      scraped: 0,
      inserted: 0,
      skipped: 0,
      errors: 1,
      duration_ms: Date.now() - startTime,
    };
  }

  runId = run.id as string;
  setCrawlerProgress({
    phase: "running",
    runId,
    startedAt: new Date().toISOString(),
    totalLaender: BUNDESLAENDER.length,
    processedLaender: 0,
    processedProperties: 0,
    insertedProperties: 0,
    errors: 0,
  });

  let totalScraped = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const land of BUNDESLAENDER) {
    // Abort-Signal prüfen
    if (getCrawlerProgress().controlSignal === "abort") {
      console.log("[Crawler] Abbruch-Signal empfangen - beende Lauf");
      sendControlSignal("none");
      setCrawlerProgress({ phase: "aborted", finishedAt: new Date().toISOString(), currentLand: null });
      await admin.from("crawler_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: "Manuell abgebrochen" }).eq("id", runId);
      return { run_id: runId, scraped: totalScraped, inserted: totalInserted, skipped: totalSkipped, errors: totalErrors, duration_ms: Date.now() - startTime };
    }

    // Pause-Signal prüfen - wartet bis Resume oder Abort
    while (getCrawlerProgress().controlSignal === "pause") {
      setCrawlerProgress({ phase: "paused" });
      await sleep(1000);
      if (getCrawlerProgress().controlSignal === "abort") break;
    }
    if (getCrawlerProgress().controlSignal === "abort") {
      sendControlSignal("none");
      setCrawlerProgress({ phase: "aborted", finishedAt: new Date().toISOString(), currentLand: null });
      await admin.from("crawler_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: "Manuell abgebrochen" }).eq("id", runId);
      return { run_id: runId, scraped: totalScraped, inserted: totalInserted, skipped: totalSkipped, errors: totalErrors, duration_ms: Date.now() - startTime };
    }
    if (getCrawlerProgress().phase === "paused") {
      setCrawlerProgress({ phase: "running" });
    }

    console.log(`[Crawler] Scrape ${land.name} (${land.short})...`);
    setCrawlerProgress({
      currentLand: land.name,
      currentStep: "scraping",
      currentLandTotal: 0,
      currentLandEnriched: 0,
    });

    try {
      const entries = await scrapeZvgLand(land);
      console.log(`[Crawler] ${land.name}: ${entries.length} Objekte gefunden`);
      totalScraped += entries.length;

      // Gefundene Anzahl sofort in State schreiben (UI-Feedback)
      setCrawlerProgress({
        currentLandTotal: entries.length,
        currentStep: "saving",
      });

      // Phase 1: Batch-Upsert der Listendaten
      let processedInLand = 0;
      for (let i = 0; i < entries.length; i += UPSERT_BATCH_SIZE) {
        // Abort-Signal auch innerhalb eines grossen Bundeslandes pruefen
        if (getCrawlerProgress().controlSignal === "abort") {
          console.log("[Crawler] Abbruch-Signal im Batch-Loop empfangen");
          break;
        }

        const batch = entries.slice(i, i + UPSERT_BATCH_SIZE);
        const { inserted, skipped } = await upsertBatch(admin, batch);
        totalInserted += inserted;
        totalSkipped += skipped;
        processedInLand += batch.length;

        setCrawlerProgress({
          processedProperties: (totalScraped - entries.length) + processedInLand,
          insertedProperties: totalInserted,
          errors: totalErrors,
        });

        // Event-Loop und Pause: gibt Next.js-Server Zeit fuer andere Requests
        await yieldToEventLoop();
        if (i + UPSERT_BATCH_SIZE < entries.length) {
          await sleep(BATCH_PAUSE_MS);
        }
      }

      // Phase 2: Detail-Enrichment (Dokumente, Grundbuch, Beschreibung, etc.)
      // Uebersprungen wenn skipEnrichment=true (Vercel 300s-Limit)
      if (!skipEnrichment && getCrawlerProgress().controlSignal !== "abort" && entries.length > 0) {
        setCrawlerProgress({ currentStep: "enriching" });
        await enrichWithDetails(admin, entries);
      }

      // Phase 3: Suchalarm-Benachrichtigungen fuer neue Objekte
      if (entries.length > 0) {
        const newZvgIds = entries.map((e) => e.zvg_id);
        notifySearchAlerts(admin, newZvgIds).catch((err) =>
          console.error("[Crawler] Suchalarm-Benachrichtigung fehlgeschlagen:", err)
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Crawler] Fehler bei ${land.name}:`, message);
      totalErrors++;
      setCrawlerProgress({ errors: totalErrors, lastError: message, lastErrorLand: land.name });
    }

    setCrawlerProgress({
      processedLaender: BUNDESLAENDER.indexOf(land) + 1,
      currentStep: null,
    });

    // Rate limiting - ZVG-Portal nicht ueberlasten
    if (land !== BUNDESLAENDER[BUNDESLAENDER.length - 1]) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  const duration_ms = Date.now() - startTime;
  const result: CrawlerRunResult = {
    run_id: runId,
    scraped: totalScraped,
    inserted: totalInserted,
    skipped: totalSkipped,
    errors: totalErrors,
    duration_ms,
  };

  await updateCrawlerRun(admin, runId, result);

  setCrawlerProgress({
    phase: totalErrors > totalScraped * 0.5 ? "error" : "completed",
    currentLand: null,
    finishedAt: new Date().toISOString(),
    processedProperties: totalScraped,
    insertedProperties: totalInserted,
    errors: totalErrors,
  });

  console.log(
    `[Crawler] Abgeschlossen in ${Math.round(duration_ms / 1000)}s - ` +
      `${totalScraped} gefunden, ${totalInserted} gespeichert, ${totalErrors} Fehler`
  );

  // Admin-E-Mail bei kritischen Fehlern (mehr als 50 % der Objekte fehlgeschlagen)
  if (totalErrors > 0 && totalErrors > totalScraped * 0.5) {
    sendCrawlerErrorNotification({
      errorMessage: `${totalErrors} von ${totalScraped} Objekten konnten nicht verarbeitet werden.`,
      stats: result,
    }).catch((err) => console.error("[Crawler] Admin-E-Mail fehlgeschlagen:", err));
  }

  return result;
}
