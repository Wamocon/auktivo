import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/favorites - Favorit hinzufuegen oder entfernen (Toggle)
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { property_id?: string };
  const { property_id } = body;

  if (!property_id) {
    return NextResponse.json({ error: "property_id required" }, { status: 400 });
  }

  // Pruefen ob Favorit bereits existiert
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("property_id", property_id)
    .maybeSingle();

  if (existing) {
    // Favorit entfernen
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("property_id", property_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ action: "removed", isFavorite: false });
  } else {
    // Favorit hinzufuegen
    const { error } = await supabase.from("favorites").insert({
      user_id: user.id,
      property_id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ action: "added", isFavorite: true });
  }
}

// GET /api/favorites?property_id=xxx - Status pruefen
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isFavorite: false });
  }

  const { searchParams } = new URL(request.url);
  const property_id = searchParams.get("property_id");

  if (!property_id) {
    return NextResponse.json({ isFavorite: false });
  }

  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("property_id", property_id)
    .maybeSingle();

  return NextResponse.json({ isFavorite: !!data });
}
