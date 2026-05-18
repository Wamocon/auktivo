import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCrawlerProgress, resetCrawlerProgress } from "@/lib/crawler/runner";

// Maximale Zeit ohne setCrawlerProgress()-Update bevor der State als "tot" gilt (ms)
const STALE_THRESHOLD_MS = 5 * 60 * 1_000; // 5 Minuten

export async function GET() {
  const supabase = await createClient();
  // getUser() verifiziert den JWT gegen den Auth-Server - kein DB-Query nötig
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  // Admin-Check über app_metadata aus dem JWT - kein DB-Query
  const isAdmin = (user.app_metadata as Record<string, unknown>)?.is_admin === true;

  if (!isAdmin) {
    // Fallback: DB-Query wenn is_admin nicht im JWT
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Kein Admin-Zugriff" }, { status: 403 });
    }
  }

  const progress = getCrawlerProgress();

  // Stale-Detection: Prozess wurde von Vercel gekillt (300s-Timeout) aber State zeigt noch "running".
  // Pruefen: updatedAt liegt > 5 Minuten in der Vergangenheit UND kein aktiver DB-Run.
  if (progress.phase === "running" && progress.updatedAt) {
    const lastUpdate = new Date(progress.updatedAt).getTime();
    if (Date.now() - lastUpdate > STALE_THRESHOLD_MS) {
      // Cross-Check mit DB: gibt es einen laufenden crawler_run?
      const admin = createAdminClient();
      const { data: activeRun } = await admin
        .from("crawler_runs")
        .select("id, status")
        .eq("status", "running")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (!activeRun) {
        // Kein aktiver Run in der DB - Prozess wurde gekillt, State zuruecksetzen
        console.warn(
          "[Crawler/Status] In-Memory-State zeigt 'running' seit " +
          `${Math.round((Date.now() - lastUpdate) / 60_000)} Minuten ohne Update. ` +
          "Kein aktiver DB-Run gefunden - Auto-Reset auf 'error'."
        );
        resetCrawlerProgress();
        return NextResponse.json(
          {
            ...getCrawlerProgress(),
            phase: "error" as const,
            lastError: "Crawler-Prozess wurde durch Vercel-Timeout (300s) beendet. Bitte neu starten.",
            finishedAt: progress.updatedAt,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      } else {
        // Aktiver DB-Run vorhanden aber kein In-Memory-Update - Zombie-Run schliessen
        console.warn(
          `[Crawler/Status] Zombie-DB-Run ${activeRun.id} gefunden - wird als 'failed' markiert.`
        );
        await admin
          .from("crawler_runs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message: "Vercel-Timeout: Prozess nach 300s beendet (kein In-Memory-Update mehr).",
          })
          .eq("id", activeRun.id);
        resetCrawlerProgress();
        return NextResponse.json(
          {
            ...getCrawlerProgress(),
            phase: "error" as const,
            lastError: "Crawler-Prozess wurde durch Vercel-Timeout (300s) beendet. Bitte neu starten.",
            finishedAt: progress.updatedAt,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }
  }

  return NextResponse.json(progress, {
    headers: { "Cache-Control": "no-store" },
  });
}
