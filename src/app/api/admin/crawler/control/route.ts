import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestCancel, requestPause, requestResume, getCrawlerProgress } from "@/lib/crawler/state";

export async function POST(request: Request) {
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

  const body = await request.json() as { action: string };
  const { action } = body;

  const current = getCrawlerProgress();

  switch (action) {
    case "pause":
      if (current.phase !== "running") {
        return NextResponse.json({ error: "Crawler läuft nicht" }, { status: 400 });
      }
      requestPause();
      return NextResponse.json({ status: "paused" });

    case "resume":
      if (current.phase !== "paused") {
        return NextResponse.json({ error: "Crawler ist nicht pausiert" }, { status: 400 });
      }
      requestResume();
      return NextResponse.json({ status: "resumed" });

    case "cancel":
      if (current.phase !== "running" && current.phase !== "paused") {
        return NextResponse.json({ error: "Kein aktiver Crawler-Lauf" }, { status: 400 });
      }
      requestCancel();
      // Falls pausiert, auch resume setzen damit die waitWhilePaused-Schleife beendet wird
      if (current.phase === "paused") requestResume();
      return NextResponse.json({ status: "cancelled" });

    default:
      return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  }
}
