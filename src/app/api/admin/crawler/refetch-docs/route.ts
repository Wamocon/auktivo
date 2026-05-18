/**
 * Admin-Endpoint: PDF-Dokumente fuer ALLE Properties vom ZVG-Portal neu abrufen.
 *
 * Anders als der regulaere Enricher (der nur Properties mit beschreibung IS NULL
 * bearbeitet) durchlaeuft dieser Endpoint alle Properties und prueft erneut auf
 * PDF-Links - auch wenn die Property bereits angereichert wurde.
 *
 * POST /api/admin/crawler/refetch-docs
 * POST /api/admin/crawler/refetch-docs?batch=20&offset=0
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getZvgSession } from "@/lib/crawler/enricher";
import { scrapeZvgDetail } from "@/lib/crawler/scraper";
import { ensureDocsBucket, downloadPropertyDocuments } from "@/lib/crawler/documents";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_BATCH = 20;
const MAX_BATCH = 50;

export async function POST(request: Request) {
  // Admin-Check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Kein Admin-Zugriff" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const batchSize = Math.min(
    parseInt(searchParams.get("batch") ?? String(DEFAULT_BATCH), 10) || DEFAULT_BATCH,
    MAX_BATCH
  );
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  // Gesamtanzahl der Properties fuer Fortschrittsanzeige
  const { count: totalCount } = await admin
    .from("properties")
    .select("id", { count: "exact", head: true })
    .not("zvg_id", "is", null)
    .not("land_abk", "is", null);

  // Naechsten Batch laden (alle Properties, nicht nur beschreibung IS NULL)
  const { data: props, error: propsErr } = await admin
    .from("properties")
    .select("id, zvg_id, land_abk")
    .not("zvg_id", "is", null)
    .not("land_abk", "is", null)
    .order("id")
    .range(offset, offset + batchSize - 1);

  if (propsErr) {
    return NextResponse.json({ error: propsErr.message }, { status: 500 });
  }

  if (!props?.length) {
    return NextResponse.json({ processed: 0, docsFound: 0, remaining: 0 });
  }

  const sessionCookie = await getZvgSession();
  await ensureDocsBucket(admin);

  let processed = 0;
  let docsFound = 0;

  for (const prop of props) {
    try {
      // zvg_id parsen: "RP-3627" oder "RP_3627" oder rein numerisch
      const zvgParts = (prop.zvg_id as string).split(/[-_]/);
      const zvgNumId = zvgParts.length >= 2 ? zvgParts[zvgParts.length - 1] : zvgParts[0] ?? "";
      const landAbk = ((prop.land_abk as string) ?? zvgParts[0] ?? "").toUpperCase();

      if (!zvgNumId || !landAbk) {
        processed++;
        continue;
      }

      const detail = await scrapeZvgDetail(zvgNumId, landAbk, sessionCookie);

      if (detail.document_urls.length > 0) {
        // URLs in properties-Tabelle speichern
        await admin
          .from("properties")
          .update({ document_urls: detail.document_urls })
          .eq("id", prop.id as string);

        // property_documents-Eintraege anlegen (ignoriert Duplikate)
        await admin.from("property_documents").upsert(
          detail.document_urls.map((url) => ({
            property_id: prop.id as string,
            original_url: url,
            ocr_status: "pending" as const,
          })),
          { onConflict: "property_id,original_url", ignoreDuplicates: true }
        );

        // PDFs herunterladen und OCR-Text extrahieren
        await downloadPropertyDocuments(
          prop.id as string,
          detail.document_urls,
          sessionCookie,
          admin
        );

        docsFound += detail.document_urls.length;
      }

      processed++;
    } catch (err) {
      console.error(
        `[RefetchDocs] Fehler bei ${prop.zvg_id}:`,
        err instanceof Error ? err.message : String(err)
      );
      processed++;
    }
  }

  const remaining = Math.max(0, (totalCount ?? 0) - offset - processed);

  return NextResponse.json({ processed, docsFound, remaining, nextOffset: offset + processed });
}
