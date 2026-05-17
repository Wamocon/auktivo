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
  const bundesland = searchParams.get("bundesland");
  const radius = searchParams.get("radius") ? Number(searchParams.get("radius")) : 25;
  const types = searchParams.get("types")?.split(",").filter(Boolean) ?? [];
  const budgetMin = searchParams.get("budget_min") ? Number(searchParams.get("budget_min")) : null;
  const budgetMax = searchParams.get("budget_max") ? Number(searchParams.get("budget_max")) : null;

  // PLZ-Prefix-Laenge basierend auf Umkreis: groesserer Umkreis = kuerzerer Prefix = mehr Treffer
  function zipPrefixLength(r: number): number {
    if (r >= 100) return 1;
    if (r >= 50)  return 2;
    if (r >= 25)  return 3;
    return 4;
  }

  let query = supabase
    .from("properties")
    .select("*, property_analyses(risk_level, summary, analysis_status)")
    .eq("status", "active")
    .order("auction_date", { ascending: true })
    .limit(100);

  if (zip) {
    const prefixLen = zipPrefixLength(radius);
    query = query.like("zip_code", `${zip.slice(0, prefixLen)}%`);
  }

  if (bundesland) {
    query = query.eq("land_abk", bundesland);
  }

  if (types.length > 0) {
    query = query.in("property_type", types);
  }

  if (budgetMin !== null) {
    query = query.gte("minimum_bid", budgetMin);
  }

  if (budgetMax !== null) {
    query = query.lte("minimum_bid", budgetMax);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }

  return NextResponse.json({ properties: data ?? [], remaining });
}
