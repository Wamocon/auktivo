import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSearchLimit } from "@/lib/feature-gate";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip");
  const bundesland = searchParams.get("bundesland");
  const radius = searchParams.get("radius") ? Number(searchParams.get("radius")) : 25;
  const types = searchParams.get("types")?.split(",").filter(Boolean) ?? [];
  const budgetMin = searchParams.get("budget_min") ? Number(searchParams.get("budget_min")) : null;
  const budgetMax = searchParams.get("budget_max") ? Number(searchParams.get("budget_max")) : null;
  const terminVon = searchParams.get("termin_von");
  const terminBis = searchParams.get("termin_bis");
  const sortBy = searchParams.get("sort_by") ?? "auction_date_asc";
  const court = searchParams.get("court");

  // Offene Suche (keine Filter) = Alle Objekte durchblaettern = KEIN Limitzaehler
  const isOpenSearch = !zip && !bundesland && types.length === 0 && !budgetMin && !budgetMax && !terminVon && !terminBis && !court;

  let remaining = 5; // Standardwert fuer Anzeige
  if (!isOpenSearch) {
    const { allowed, remaining: rem } = await checkSearchLimit(user.id);
    remaining = rem;
    if (!allowed) {
      return NextResponse.json({ limitReached: true, remaining: 0 }, { status: 200 });
    }
  }

  // PLZ-Prefix-Laenge basierend auf Umkreis
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
    .limit(isOpenSearch ? 500 : 200);

  // Sortierung
  if (sortBy === "price_asc")  query = query.order("minimum_bid", { ascending: true });
  else if (sortBy === "price_desc") query = query.order("minimum_bid", { ascending: false });
  else if (sortBy === "state") query = query.order("state", { ascending: true }).order("auction_date", { ascending: true });
  else query = query.order("auction_date", { ascending: sortBy !== "auction_date_desc" });

  if (zip) {
    const prefixLen = zipPrefixLength(radius);
    query = query.like("zip_code", `${zip.slice(0, prefixLen)}%`);
  }
  if (bundesland) query = query.eq("land_abk", bundesland);
  if (types.length > 0) query = query.in("property_type", types);
  if (budgetMin !== null) query = query.gte("minimum_bid", budgetMin);
  if (budgetMax !== null) query = query.lte("minimum_bid", budgetMax);
  if (terminVon) query = query.gte("auction_date", new Date(terminVon).toISOString());
  if (terminBis) query = query.lte("auction_date", new Date(terminBis).toISOString());
  if (court) query = query.ilike("court", `%${court}%`);

  const { data, error } = await query;

  if (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }

  return NextResponse.json({ properties: data ?? [], remaining, isOpenSearch });
}
