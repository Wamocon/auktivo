import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCrawlerProgress } from "@/lib/crawler/runner";

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

  return NextResponse.json(getCrawlerProgress(), {
    headers: { "Cache-Control": "no-store" },
  });
}
