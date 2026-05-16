/**
 * Next.js 16 Instrumentation - runs once on server start.
 * In production the crawler is triggered via Vercel Cron -> /api/crawler/trigger.
 * In development the auto-start is disabled to avoid schema errors on fresh setups.
 * Set CRAWLER_AUTO_START=true in .env.local to re-enable auto-start locally.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV !== "development") return;

  // Only auto-start when explicitly enabled (prevents schema errors on fresh setups)
  if (process.env.CRAWLER_AUTO_START !== "true") {
    console.log("[Instrumentation] Crawler auto-start disabled. Set CRAWLER_AUTO_START=true to enable.");
    return;
  }

  console.log("[Instrumentation] Starte ZVG-Crawler im Hintergrund...");

  import("./lib/crawler/runner")
    .then(({ runCrawler }) => {
      setTimeout(() => {
        runCrawler().catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[Instrumentation] Crawler-Fehler:", msg);
        });
      }, 5_000);
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Instrumentation] Crawler konnte nicht geladen werden:", msg);
    });
}
