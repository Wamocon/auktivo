import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeZvgLand, scrapeZvgDetail } from "./scraper";
import { BUNDESLAENDER } from "@/lib/utils/bundeslaender";
import { getCrawlerProgress, setCrawlerProgress, resetCrawlerProgress, sendControlSignal } from "./state";
import type { CrawlerRunResult, ZvgEntry } from "./types";

export { getCrawlerProgress };

const RATE_LIMIT_MS = 2_000;    // 2 Sekunden zwischen Bundeslaender-Requests
const UPSERT_BATCH_SIZE = 50;   // Eintraege pro Supabase-Batch-Request
const BATCH_PAUSE_MS = 300;     // Pause zwischen Batch-Upserts (300ms - gibt Event-Loop mehr Raum)
const DETAIL_CONCURRENCY = 5;   // Parallele Detail-Page-Requests
const DETAIL_PAUSE_MS = 200;    // Pause zwischen Detail-Batches
const DETAIL_MAX_MINUTES = 4;   // Max. Minuten fuer Detail-Enrichment pro Bundesland

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
 * Reduziert die Anzahl der Netzwerk-Roundtrips drastisch.
 */
async function upsertBatch(
  admin: ReturnType<typeof createAdminClient>,
  entries: ZvgEntry[]
): Promise<{ inserted: number; skipped: number }> {
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
    console.error(
      `[Crawler] Batch-Upsert-Fehler (${entries.length} Eintraege):`,
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
  const deadline = Date.now() + DETAIL_MAX_MINUTES * 60 * 1_000;

  for (let i = 0; i < entries.length; i += DETAIL_CONCURRENCY) {
    // Zeitlimit und Abort-Signal pruefen
    if (getCrawlerProgress().controlSignal === "abort") break;
    if (Date.now() > deadline) {
      console.warn(
        `[Crawler] Detail-Enrichment nach ${DETAIL_MAX_MINUTES} Min. abgebrochen ` +
        `(${i}/${entries.length} verarbeitet)`
      );
      break;
    }

    const batch = entries.slice(i, i + DETAIL_CONCURRENCY);

    await Promise.all(
      batch.map(async (entry) => {
        try {
          const detail = await scrapeZvgDetail(entry.zvg_id_numeric, entry.land_abk);
          await admin
            .from("properties")
            .update({
              art_versteigerung: detail.art_versteigerung,
              grundbuch: detail.grundbuch,
              beschreibung: detail.beschreibung,
              versteigerungsort: detail.versteigerungsort,
              glaeubigerinfo: detail.glaeubigerinfo,
              geoserver_url: detail.geoserver_url,
              document_urls: detail.document_urls,
            })
            .eq("zvg_id", entry.zvg_id);

          // Dokument-URLs als ausstehende OCR-Jobs registrieren
          if (detail.document_urls.length > 0) {
            const { data: prop } = await admin
              .from("properties")
              .select("id")
              .eq("zvg_id", entry.zvg_id)
              .single();
            if (prop?.id) {
              await admin.from("property_documents").upsert(
                detail.document_urls.map((url) => ({
                  property_id: prop.id,
                  original_url: url,
                  ocr_status: "pending" as const,
                })),
                { onConflict: "property_id,original_url", ignoreDuplicates: true }
              );
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[Crawler] Detail-Fehler ${entry.zvg_id}:`, msg);
        }
      })
    );

    if (i + DETAIL_CONCURRENCY < entries.length) {
      await sleep(DETAIL_PAUSE_MS);
    }
  }

  console.log(`[Crawler] Detail-Enrichment abgeschlossen`);
}

/**
 * Fuehrt einen vollstaendigen Crawler-Lauf durch:
 * 1. Erstellt einen crawler_runs-Eintrag
 * 2. Scraped alle 16 Bundeslaender nacheinander (rate-limited)
 * 3. Speichert Objekte via upsert in properties
 * 4. Schliesst den crawler_runs-Eintrag ab
 */
export async function runCrawler(): Promise<CrawlerRunResult> {
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
    setCrawlerProgress({ currentLand: land.name });

    try {
      const entries = await scrapeZvgLand(land);
      console.log(`[Crawler] ${land.name}: ${entries.length} Objekte gefunden`);
      totalScraped += entries.length;

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
      // Nur starten wenn kein Abort-Signal
      if (getCrawlerProgress().controlSignal !== "abort" && entries.length > 0) {
        await enrichWithDetails(admin, entries);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Crawler] Fehler bei ${land.name}:`, message);
      totalErrors++;
      setCrawlerProgress({ errors: totalErrors, lastError: message });
    }

    setCrawlerProgress({ processedLaender: BUNDESLAENDER.indexOf(land) + 1 });

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

  return result;
}
