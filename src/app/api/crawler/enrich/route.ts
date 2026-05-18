/**
 * Automatisch selbst-kettender Enrichment-Endpoint.
 *
 * Sicherung: CRON_SECRET im Authorization-Header.
 * Jede Instanz laeuft ≤300s (Batch 30 Properties, ~90s).
 * Nach Abschluss: wenn noch Properties ausstehen, loest sie sich selbst erneut aus.
 * Kette stoppt wenn remaining=0.
 *
 * Aufgerufen von:
 * - /api/crawler/trigger  (nach dem Listen-Scrape)
 * - Sich selbst           (via after() solange remaining > 0)
 *
 * Schutz gegen Doppellaeufe: wenn aktuell ein Lauf besteht (Status "enriching"
 * und started < 5 Min. zuvor), wird der Aufruf ignoriert.
 */
import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichPropertiesBatch } from "@/lib/crawler/enricher";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 30;

/** Bestimmt die Basis-URL fuer den naechsten Selbst-Aufruf.
 * VERCEL_URL hat Prioritaet: immer die aktuelle Deployment-URL (Preview ODER Production).
 * Verhindert, dass ein Preview-Deployment den Produktions-Crawler auslöst.
 */
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

export async function POST(request: Request) {
  // CRON_SECRET-Sicherung
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  const providedSecret = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Schutz: ist gerade ein Batch am Laufen? (started < 5 Min.)
  const { data: activeRun } = await admin
    .from("crawler_runs")
    .select("id, started_at")
    .eq("status", "enriching")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeRun) {
    const ageMs = Date.now() - new Date(activeRun.started_at).getTime();
    if (ageMs < 5 * 60 * 1000) {
      return NextResponse.json({ status: "already_running" });
    }
  }

  // Lauf als "enriching" markieren - ID sofort speichern fuer spaeteres Update
  const { data: newRun } = await admin
    .from("crawler_runs")
    .insert({
      status: "enriching",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const runId = newRun?.id as string | undefined;

  after(async () => {
    let remaining = 1; // Startwert > 0 um erste Iteration anzustossen
    let batchProcessed = 0;
    let batchFailed = 0;

    try {
      const result = await enrichPropertiesBatch(BATCH_SIZE);
      batchProcessed = result.processed;
      batchFailed = result.failed;
      remaining = result.remaining;

      console.log(
        `[Enrich] Batch: ${batchProcessed} verarbeitet, ${batchFailed} fehlgeschlagen,` +
        ` ${remaining} verbleibend`
      );
    } catch (err) {
      console.error("[Enrich] Batch-Fehler:", err instanceof Error ? err.message : String(err));
      remaining = 0; // Bei Fehler Kette abbrechen
    }

    // Lauf abschliessen per ID (Supabase PostgREST unterstuetzt ORDER/LIMIT auf UPDATE nicht)
    if (runId) {
      await admin
        .from("crawler_runs")
        .update({
          status: remaining > 0 ? "enriching" : "completed",
          finished_at: new Date().toISOString(),
          new_properties_count: batchProcessed,
          updated_properties_count: 0,
          error_message: batchFailed > 0 ? `${batchFailed} Fehler` : null,
        })
        .eq("id", runId);
    }

    // Wenn noch Properties offen: naechsten Batch ausloesen (neue Funktion, frische 300s)
    if (remaining > 0 && batchProcessed > 0) {
      const baseUrl = getBaseUrl();
      try {
        await fetch(`${baseUrl}/api/crawler/enrich`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
            "Content-Type": "application/json",
          },
        });
        console.log(`[Enrich] Naechsten Batch ausgeloest (${remaining} verbleibend)`);
      } catch (triggerErr) {
        console.error(
          "[Enrich] Konnte naechsten Batch nicht ausloesen:",
          triggerErr instanceof Error ? triggerErr.message : String(triggerErr)
        );
      }
    } else if (remaining === 0) {
      console.log("[Enrich] Alle Properties angereichert - Kette beendet.");
    }
  });

  return NextResponse.json({ status: "started" });
}
