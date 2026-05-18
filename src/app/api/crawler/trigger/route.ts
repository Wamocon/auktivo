import { NextResponse, after } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Nur CRON_SECRET-Check + DB-Record + ersten Land-Trigger.
// Eigentliche Arbeit: /api/crawler/run-land (selbst-kettend, 1 Bundesland pro Aufruf).
export const maxDuration = 30;

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

export async function POST() {
  const headersList = await headers();
  const authorization = headersList.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Doppelstart verhindern — haengende Laeufe (>8 Min.) automatisch bereinigen.
  const admin = createAdminClient();
  const { data: activeRun } = await admin
    .from("crawler_runs")
    .select("id, started_at")
    .in("status", ["running", "enriching"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeRun) {
    const ageMs = Date.now() - new Date(activeRun.started_at as string).getTime();
    if (ageMs < 8 * 60 * 1_000) {
      return NextResponse.json({ status: "already_running", runId: activeRun.id });
    }
    console.warn(`[CRON/Crawler] Haengender Lauf ${activeRun.id} automatisch beendet (${Math.round(ageMs / 60_000)} Min. alt)`);
    await admin
      .from("crawler_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: "Automatisch beendet: Vercel-Funktion getimeouted",
      })
      .eq("id", activeRun.id as string);
  }

  // Neuen Lauf in DB anlegen
  const { data: run, error: runErr } = await admin
    .from("crawler_runs")
    .insert({ status: "running", started_at: new Date().toISOString() })
    .select()
    .single();

  if (runErr || !run) {
    console.error("[CRON/Crawler] DB-Fehler:", runErr?.message);
    return NextResponse.json({ error: "DB-Fehler" }, { status: 500 });
  }

  const runId = run.id as string;
  const baseUrl = getBaseUrl();

  // Ersten Land-Aufruf nach dem Response anstoßen
  after(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/crawler/run-land?run_id=${runId}&index=0`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log("[CRON/Crawler] Erste Land-Chain gestartet, run_id:", runId);
    } catch (err) {
      console.error("[CRON/Crawler] Ersten Land-Trigger fehlgeschlagen:", err);
      await admin
        .from("crawler_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: `Start fehlgeschlagen: ${String(err)}`,
        })
        .eq("id", runId);
    }
  });

  return NextResponse.json({ status: "started", runId });
}
