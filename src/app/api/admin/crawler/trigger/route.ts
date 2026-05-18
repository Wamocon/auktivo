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

  // Bereits laufend laut DB? Doppelstart verhindern (cross-instance safe).
  const admin = createAdminClient();
  const { data: activeRun } = await admin
    .from("crawler_runs")
    .select("id, started_at")
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeRun) {
    return NextResponse.json({ status: "already_running", runId: activeRun.id });
  }

  // after() haelt die Vercel-Funktion nach dem Response am Leben (waitUntil).
  // Ohne after() wuerde der Crawler sofort nach return gekillt.
  after(async () => {
    await runCrawler().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Admin/Crawler] Crawler-Fehler:", msg);
    });
  });

  return NextResponse.json({ status: "started" });
}
