import { NextResponse, after } from "next/server";
import { headers } from "next/headers";
import { runCrawler } from "@/lib/crawler/runner";

// Vercel Pro: 300s maximales Zeitlimit - Cron-Funktion laeuft bis zum Limit.
export const maxDuration = 300;

export async function POST() {
  const headersList = await headers();
  const authorization = headersList.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // after() haelt die Vercel-Funktion nach dem Response am Leben (waitUntil).
  // Ohne after() wuerde der Crawler sofort nach return gekillt.
  after(async () => {
    await runCrawler().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[API/crawler/trigger] Crawler-Fehler:", msg);
    });
  });

  return NextResponse.json({ status: "started" });
}
