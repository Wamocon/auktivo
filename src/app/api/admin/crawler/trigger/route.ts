import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Nur Auth + DB-Record-Anlage + ersten Land-Trigger.
// Die eigentliche Arbeit erledigt /api/crawler/run-land (selbst-kettend, 1 Bundesland pro Call).
export const maxDuration = 30;

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin-Check: app_metadata aus JWT zuerst (kein DB-Query noetig)
  const isAdmin = (user.app_metadata as Record<string, unknown>)?.is_admin === true;

  if (!isAdmin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
    console.warn(`[Admin/Crawler] Haengender Lauf ${activeRun.id} wird automatisch beendet (${Math.round(ageMs / 60_000)} Min. alt)`);
    await admin
      .from("crawler_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: "Automatisch beendet: Vercel-Funktion getimeouted",
      })
      .eq("id", activeRun.id as string);
  }

  // Neuen Lauf in DB anlegen - Ergebnis wird von run-land inkrementell beschrieben
  const { data: run, error: runErr } = await admin
    .from("crawler_runs")
    .insert({ status: "running", started_at: new Date().toISOString() })
    .select()
    .single();

  if (runErr || !run) {
    console.error("[Admin/Crawler] DB-Fehler beim Anlegen des Laufs:", runErr?.message);
    return NextResponse.json({ error: "DB-Fehler" }, { status: 500 });
  }

  // CRON_SECRET mit trim() pruefen - Whitespace-Only gilt als nicht gesetzt.
  // Fallback auf VERCEL_DEPLOYMENT_ID (automatisch in Vercel verfuegbar).
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret && !process.env.VERCEL_DEPLOYMENT_ID) {
    // Kein Token verfuegbar - weder CRON_SECRET noch VERCEL_DEPLOYMENT_ID (lokal ohne .env.local)
    await admin
      .from("crawler_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: "Konfigurationsfehler: CRON_SECRET ist nicht gesetzt (Vercel-Umgebungsvariable fehlt).",
      })
      .eq("id", run.id as string);
    return NextResponse.json(
      { error: "CRON_SECRET ist nicht konfiguriert. Bitte in Vercel unter Settings > Environment Variables eintragen." },
      { status: 500 }
    );
  }

  const runId = run.id as string;
  const baseUrl = getBaseUrl();

  // Ersten Land-Aufruf nach dem Response anstoßen (Bundesland 0 = Bayern / erster Eintrag)
  after(async () => {
    try {
      // VERCEL_DEPLOYMENT_ID hat Prioritaet: automatisch von Vercel gesetzt,
      // konsistent fuer alle Funktionen im selben Deployment, kein Whitespace-Problem.
      // CRON_SECRET als Fallback fuer lokale Entwicklung.
      // || statt ?? damit leere Strings ("") ebenfalls zum Fallback fuehren.
      const authToken = process.env.VERCEL_DEPLOYMENT_ID || process.env.CRON_SECRET?.trim() || "";
      const res = await fetch(`${baseUrl}/api/crawler/run-land?run_id=${runId}&index=0`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log("[Admin/Crawler] Erste Land-Chain gestartet, run_id:", runId);
    } catch (err) {
      console.error("[Admin/Crawler] Ersten Land-Trigger fehlgeschlagen:", err);
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

