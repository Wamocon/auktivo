import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const headersList = await headers();
  const authorization = headersList.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Neuen Crawler-Lauf starten
  const { data: run } = await admin
    .from("crawler_runs")
    .insert({
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  // Hier wird der externe Python-Playwright-Crawler ausgeloest.
  // In Produktion: HTTP-Request an den Crawler-Service oder Vercel Cron Job.
  console.log(`Crawler run ${run?.id} started`);

  return NextResponse.json({ runId: run?.id, status: "started" });
}
