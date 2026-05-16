import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichPropertyLocation } from "@/lib/utils/geo-enrichment";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Property aus DB laden (admin, kein RLS-Filter noetig)
  const admin = createAdminClient();
  const { data: property, error } = await admin
    .from("properties")
    .select("id, address, city, zip_code, lat, lng")
    .eq("id", id)
    .single();

  if (error || !property) {
    return NextResponse.json({ error: "Property nicht gefunden" }, { status: 404 });
  }

  const data = await enrichPropertyLocation({
    address: property.address as string | null,
    zipCode: property.zip_code as string,
    city: property.city as string | null,
    lat: property.lat as number | null,
    lon: property.lng as number | null,
  });

  return NextResponse.json(data, {
    headers: {
      // Browser-seitiges Caching: 1 Stunde
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
