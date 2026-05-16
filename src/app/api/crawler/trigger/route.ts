import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runCrawler } from "@/lib/crawler/runner";

export async function POST() {
  const headersList = await headers();
  const authorization = headersList.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Crawler asynchron starten - Response sofort zurueckgeben
  // damit Vercel Cron nicht in den Timeout laeuft
  runCrawler().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API/crawler/trigger] Crawler-Fehler:", msg);
  });

  return NextResponse.json({ status: "started" });
}
