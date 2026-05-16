import { createAdminClient } from "@/lib/supabase/admin";
import { BUNDESLAENDER, scrapeZvgLand } from "./scraper";
import { getCrawlerProgress, setCrawlerProgress, resetCrawlerProgress } from "./state";
import type { CrawlerRunResult, ZvgEntry } from "./types";

export { getCrawlerProgress };

const RATE_LIMIT_MS = 2_000; // 2 Sekunden zwischen Bundeslaender-Requests

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wartet, solange pauseRequested=true ist. Gibt false zurück wenn cancel angefordert. */
async function waitWhilePaused(): Promise<boolean> {
  while (getCrawlerProgress().pauseRequested) {
    if (getCrawlerProgress().cancelRequested) return false;
    await sleep(500);
  }
  return !getCrawlerProgress().cancelRequested;
}

async function upsertProperty(
  admin: ReturnType<typeof createAdminClient>,
  entry: ZvgEntry
): Promise<"inserted" | "skipped"> {
  const { error } = await admin.from("properties").upsert(
    {
      zvg_id: entry.zvg_id,
      court: entry.amtsgericht,
      court_file_number: entry.aktenzeichen,
      auction_date: entry.termin?.toISOString() ?? null,
      property_type: entry.property_type,
      address: entry.adresse,
      city: entry.ort,
      zip_code: entry.plz ?? "00000",
      state: entry.state,
      market_value: entry.verkehrswert_eur,
      minimum_bid: entry.verkehrswert_eur
        ? Math.round(entry.verkehrswert_eur * 0.5)
        : null,
      document_urls: entry.document_urls,
      status: "active",
      last_crawled_at: new Date().toISOString(),
    },
    {
      onConflict: "zvg_id",
      ignoreDuplicates: false, // Daten immer aktualisieren
    }
  );

  if (error) {
    console.error(`[Crawler] Upsert-Fehler fuer ${entry.zvg_id}:`, error.message);
    return "skipped";
  }

  return "inserted";
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
    // Abbruch prüfen
    if (getCrawlerProgress().cancelRequested) {
      console.log("[Crawler] Abbruch angefordert - stoppe.");
      setCrawlerProgress({ phase: "error", lastError: "Abgebrochen", finishedAt: new Date().toISOString(), currentLand: null });
      await admin.from("crawler_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: "Vom Admin abgebrochen" }).eq("id", runId);
      return { run_id: runId, scraped: totalScraped, inserted: totalInserted, skipped: totalSkipped, errors: totalErrors, duration_ms: Date.now() - startTime };
    }

    // Pause prüfen - warten bis Resume
    if (getCrawlerProgress().pauseRequested) {
      const continued = await waitWhilePaused();
      if (!continued) {
        setCrawlerProgress({ phase: "error", lastError: "Abgebrochen", finishedAt: new Date().toISOString(), currentLand: null });
        await admin.from("crawler_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: "Vom Admin abgebrochen" }).eq("id", runId);
        return { run_id: runId, scraped: totalScraped, inserted: totalInserted, skipped: totalSkipped, errors: totalErrors, duration_ms: Date.now() - startTime };
      }
      setCrawlerProgress({ phase: "running" });
    }

    console.log(`[Crawler] Scrape ${land.name} (${land.short})...`);
    setCrawlerProgress({ currentLand: land.name });

    try {
      const entries = await scrapeZvgLand(land);
      console.log(`[Crawler] ${land.name}: ${entries.length} Objekte gefunden`);
      totalScraped += entries.length;

      for (const entry of entries) {
        const result = await upsertProperty(admin, entry);
        if (result === "inserted") {
          totalInserted++;
        } else {
          totalSkipped++;
        }
        setCrawlerProgress({
          processedProperties: totalScraped,
          insertedProperties: totalInserted,
          errors: totalErrors,
        });
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
