/**
 * Admin-Endpoint: Detail-Anreicherung fuer unangereicherte Properties.
 * Manuell ausfuehrbar aus dem Admin-Panel (Browser-seitig kettend via EnrichButton).
 *
 * POST /api/admin/crawler/enrich
 * POST /api/admin/crawler/enrich?batch=50  (max 60)
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPropertiesBatch } from "@/lib/crawler/enricher";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_BATCH = 30;
const MAX_BATCH = 60;

export async function POST(request: Request) {
  // Admin-Check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const isAdmin = (user.app_metadata as Record<string, unknown>)?.is_admin === true;
  if (!isAdmin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Kein Admin-Zugriff" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const batchSize = Math.min(
    parseInt(searchParams.get("batch") ?? String(DEFAULT_BATCH), 10) || DEFAULT_BATCH,
    MAX_BATCH
  );

  const result = await enrichPropertiesBatch(batchSize);
  return NextResponse.json(result);
}
