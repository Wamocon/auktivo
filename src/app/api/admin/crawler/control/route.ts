import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCrawlerProgress, sendControlSignal } from "@/lib/crawler/state";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { action: "pause" | "resume" | "abort" };
  const { action } = body;

  const current = getCrawlerProgress();

  if (action === "pause") {
    if (current.phase !== "running") {
      return NextResponse.json({ error: "Crawler läuft nicht" }, { status: 409 });
    }
    sendControlSignal("pause");
    return NextResponse.json({ ok: true, signal: "pause" });
  }

  if (action === "resume") {
    if (current.phase !== "paused") {
      return NextResponse.json({ error: "Crawler ist nicht pausiert" }, { status: 409 });
    }
    sendControlSignal("none");
    return NextResponse.json({ ok: true, signal: "none" });
  }

  if (action === "abort") {
    if (current.phase !== "running" && current.phase !== "paused") {
      return NextResponse.json({ error: "Crawler ist nicht aktiv" }, { status: 409 });
    }
    sendControlSignal("abort");
    return NextResponse.json({ ok: true, signal: "abort" });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
