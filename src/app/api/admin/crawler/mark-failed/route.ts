import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { runId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.runId) return NextResponse.json({ error: "runId required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("crawler_runs")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: "Manuell als fehlerhaft markiert (Lauf war hängengeblieben)",
    })
    .eq("id", body.runId)
    .eq("status", "running"); // nur "running"-Einträge

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
