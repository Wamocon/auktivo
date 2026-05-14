import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSearchLimit } from "@/lib/feature-gate";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Suchlimit pruefen (inkrementiert atomisch in DB)
  const { allowed, remaining } = await checkSearchLimit(user.id);

  if (!allowed) {
    return NextResponse.json({ limitReached: true, remaining: 0 }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip");
  const types = searchParams.get("types")?.split(",").filter(Boolean) ?? [];

  let query = supabase
    .from("properties")
    .select("*, property_analyses(risk_level, summary, analysis_status)")
    .eq("status", "active")
    .order("auction_date", { ascending: true })
    .limit(50);

  if (zip) {
    // PLZ-basierte Filterung (einfache Prefix-Suche)
    // Fuer Produktionseinsatz: PostGIS-basierte Umkreissuche implementieren
    query = query.like("zip_code", `${zip.slice(0, 3)}%`);
  }

  if (types.length > 0) {
    query = query.in("property_type", types);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }

  return NextResponse.json({ properties: data ?? [], remaining });
}
