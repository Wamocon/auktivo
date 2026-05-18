import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runCrawler } from "@/lib/crawler/runner";

// Vercel Pro: 300s maximales Zeitlimit - Crawler-Funktion laeuft bis zum Limit.
export const maxDuration = 300;

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin-Check: app_metadata aus JWT zuerst (kein DB-Query noetig)
  const isAdmin = (user.app_metadata as Record<string, unknown>)?.is_admin === true;

  if (!isAdmin) {
    // Fallback: DB-Query wenn is_admin nicht im JWT-Claim enthalten ist
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
  // Vercel killt Funktionen nach maxDuration; ohne Cleanup bleibt der DB-Eintrag ewig auf "running".
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
      // Lauf laeuft noch (juenger als 8 Min.) - kein Doppelstart
      return NextResponse.json({ status: "already_running", runId: activeRun.id });
    }
    // Haengenden Lauf automatisch beenden (Vercel hat die Funktion getimeouted)
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

  // after() haelt die Vercel-Funktion nach dem Response am Leben (waitUntil).
  // Crawler laeuft listen-only (~250s), danach startet die selbst-kettende
  // Enrichment-Chain (/api/crawler/enrich) in separaten 300s-Instanzen.
  // VERCEL_URL bevorzugen: verhindert Cross-Deployment-Trigger (Preview -> Production).
  const appUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

  after(async () => {
    try {
      await runCrawler({ skipEnrichment: true });
    } catch (err) {
      console.error("[Admin/Crawler] Crawler-Fehler:", err instanceof Error ? err.message : String(err));
      return;
    }
    // Enrichment-Kette anstoßen (jede Instanz ≤300s, selbst-kettend bis remaining=0)
    try {
      await fetch(`${appUrl}/api/crawler/enrich`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      console.log("[Admin/Crawler] Enrichment-Kette gestartet.");
    } catch (err) {
      console.error("[Admin/Crawler] Enrichment-Start fehlgeschlagen:", err instanceof Error ? err.message : String(err));
    }
  });

  return NextResponse.json({ status: "started" });
}
