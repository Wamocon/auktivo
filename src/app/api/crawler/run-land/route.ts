/**
 * Selbst-kettender Crawler: verarbeitet GENAU EIN Bundesland pro Aufruf.
 *
 * Warum diese Architektur?
 * after() + runCrawler() in einer einzigen Vercel-Funktion haengt weil die gesamte
 * Laufzeit (16 Bundeslaender sequenziell/parallel) Vercels maxDuration ueberschreitet.
 * Loesung: Jeder Aufruf = 1 Bundesland (~10-30s), schreibt Ergebnis in DB,
 * triggert dann den naechsten Aufruf via after(). Kein einzelner Aufruf ueberschreitet 60s.
 *
 * POST /api/crawler/run-land?run_id=XXX&index=0
 * Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUNDESLAENDER } from "@/lib/utils/bundeslaender";
import { runLand } from "@/lib/crawler/runner";

export const dynamic = "force-dynamic";
// Ein Bundesland: max 45s Scrape (3 Retries x 15s) + DB-Write + naechster Trigger
export const maxDuration = 60;

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

/** Internes Auth-Token fuer Self-Chain-Aufrufe.
 * Primaer: CRON_SECRET - projekt-weit konsistent, deployment-unabhaengig.
 * Kein VERCEL_DEPLOYMENT_ID: das ist deployment-spezifisch und kann bei Rolling Deploys
 * oder Load-Balancer-Routing zu 401 fuehren wenn Sender und Empfaenger
 * aus verschiedenen Deployments bedient werden.
 *
 * WICHTIG: || statt ?? - damit leere Strings ("") ebenfalls zum Fallback fuehren. */
function resolveAuthToken(): string {
  return process.env.CRON_SECRET?.trim() || "";
}

export async function POST(request: Request) {
  const validToken = resolveAuthToken();
  const authHeader = request.headers.get("authorization") ?? "";
  const providedSecret = (authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader).trim();

  if (!validToken || providedSecret !== validToken) {
    console.error(
      `[run-land] 401 Auth-Fehler. ` +
      `VERCEL_DEPLOYMENT_ID: ${process.env.VERCEL_DEPLOYMENT_ID ? "gesetzt" : "fehlt"}, ` +
      `CRON_SECRET: ${process.env.CRON_SECRET ? "gesetzt" : "fehlt"}, ` +
      `Header-Laenge: ${authHeader.length}, ` +
      `ValidToken-Len: ${validToken.length}, ProvidedToken-Len: ${providedSecret.length}`
    );
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("run_id");
  const indexStr = searchParams.get("index");

  if (!runId || indexStr === null) {
    return NextResponse.json({ error: "run_id und index erforderlich" }, { status: 400 });
  }

  const index = parseInt(indexStr, 10);
  if (isNaN(index) || index < 0 || index >= BUNDESLAENDER.length) {
    return NextResponse.json({ error: `Ungültiger Index: ${indexStr}` }, { status: 400 });
  }

  const admin = createAdminClient();

  // Sicherstellen dass der Lauf noch aktiv ist (wurde er manuell abgebrochen?)
  const { data: run } = await admin
    .from("crawler_runs")
    .select("id, status, properties_found, new_properties_count, updated_properties_count")
    .eq("id", runId)
    .maybeSingle();

  if (!run || (run.status !== "running" && run.status !== "enriching")) {
    console.warn(`[run-land] Lauf ${runId} nicht mehr aktiv (status: ${run?.status ?? "nicht gefunden"})`);
    return NextResponse.json({ status: "aborted" });
  }

  const land = BUNDESLAENDER[index];
  const isLastLand = index + 1 >= BUNDESLAENDER.length;

  console.log(`[run-land] ${index + 1}/${BUNDESLAENDER.length}: ${land.name} (${land.short})`);

  // Genau ein Bundesland scrapen und in DB speichern
  const result = await runLand(land, admin, { skipEnrichment: true });

  // Akkumulierte Ergebnisse aus DB + aktuelle addieren
  const prevScraped = (run.properties_found as number) ?? 0;
  const prevInserted = (run.new_properties_count as number) ?? 0;
  const prevUpdated = (run.updated_properties_count as number) ?? 0;

  const newScraped = prevScraped + result.scraped;
  const newInserted = prevInserted + result.inserted;
  const newUpdated = prevUpdated + Math.max(0, result.scraped - result.inserted - result.skipped);

  // Ergebnis sofort in DB schreiben (auch bei letztem Bundesland)
  await admin
    .from("crawler_runs")
    .update({
      properties_found: newScraped,
      new_properties_count: newInserted,
      updated_properties_count: newUpdated,
      ...(isLastLand
        ? {
            status: result.errors > 0 && result.scraped === 0 ? "failed" : "completed",
            finished_at: new Date().toISOString(),
            ...(result.errors > 0 ? { error_message: `Fehler bei ${land.name}` } : {}),
          }
        : {}),
    })
    .eq("id", runId);

  const baseUrl = getBaseUrl();
  const authBearer = `Bearer ${resolveAuthToken()}`;

  if (!isLastLand) {
    // Naechstes Bundesland in separater Vercel-Instanz anstoßen
    after(async () => {
      try {
        const res = await fetch(
          `${baseUrl}/api/crawler/run-land?run_id=${runId}&index=${index + 1}`,
          { method: "POST", headers: { Authorization: authBearer } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.error(`[run-land] Kette unterbrochen bei Index ${index + 1}:`, err);
        // Lauf als fehlgeschlagen markieren wenn die Kette bricht
        await admin
          .from("crawler_runs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message: `Kette unterbrochen bei Bundesland ${index + 1}/${BUNDESLAENDER.length}: ${String(err)}`,
          })
          .eq("id", runId)
          .eq("status", "running"); // Nur updaten wenn noch "running"
      }
    });
  } else {
    // Letztes Bundesland abgeschlossen - Enrichment-Kette starten
    after(async () => {
      try {
        await fetch(`${baseUrl}/api/crawler/enrich`, {
          method: "POST",
          headers: { Authorization: authBearer },
        });
        console.log("[run-land] Enrichment-Kette gestartet.");
      } catch (err) {
        console.error("[run-land] Enrichment-Start fehlgeschlagen:", err);
      }
    });
  }

  console.log(
    `[run-land] ${land.short} fertig: ${result.scraped} gefunden, ` +
      `${result.inserted} neu, ${result.errors} Fehler. ` +
      `Gesamt: ${newScraped}/${newInserted}. ` +
      (isLastLand ? "LETZTES BUNDESLAND." : `Naechstes: ${BUNDESLAENDER[index + 1].short}`)
  );

  return NextResponse.json({
    index,
    land: land.short,
    scraped: result.scraped,
    inserted: result.inserted,
    errors: result.errors,
    total_scraped: newScraped,
    total_inserted: newInserted,
    isLastLand,
  });
}
