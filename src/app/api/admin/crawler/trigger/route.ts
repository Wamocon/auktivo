import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCrawler } from "@/lib/crawler/runner";

// Vercel Pro: 300s maximales Zeitlimit - Crawler-Funktion laeuft bis zum Limit.
export const maxDuration = 300;

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Start crawler async - do not block response
  runCrawler().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Admin/Crawler] Crawler error:", msg);
  });

  return NextResponse.json({ status: "started" });
}
