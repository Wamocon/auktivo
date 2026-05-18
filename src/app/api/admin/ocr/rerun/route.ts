/**
 * Admin-Endpoint: OCR auf bereits gespeicherten PDFs erneut ausfuehren.
 *
 * Verarbeitet alle property_documents-Eintraege mit storage_path != null
 * und ocr_status != "done". Laedt die PDFs aus Supabase Storage herunter
 * und extrahiert den Text mit pdf-parse.
 *
 * Optional: POST /api/admin/ocr/rerun?property_id=<uuid> fuer einzelne Properties.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DOCS_BUCKET = "property-docs";

/** Lazy-geladene pdf-parse Instanz */
let _pdfParse: ((buffer: Buffer) => Promise<{ text: string; numpages: number }>) | null = null;

function getPdfParse() {
  if (!_pdfParse) {
    const g = globalThis as Record<string, unknown>;
    if (!g["DOMMatrix"]) {
      g["DOMMatrix"] = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        is2D = true; isIdentity = true;
      };
    }
    if (!g["Path2D"]) g["Path2D"] = class Path2D {};
    if (!g["ImageData"]) {
      g["ImageData"] = class ImageData {
        constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
  }
  return _pdfParse;
}

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

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("property_id");

  // Dokumente mit storage_path aber ohne erfolgreichen OCR laden
  let query = admin
    .from("property_documents")
    .select("id, property_id, storage_path, ocr_status")
    .not("storage_path", "is", null)
    .neq("ocr_status", "done");

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  const { data: docs, error: docsErr } = await query.limit(50);

  if (docsErr || !docs?.length) {
    return NextResponse.json({
      processed: 0,
      message: docsErr?.message ?? "Keine Dokumente mit ausstehender OCR gefunden.",
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const doc of docs) {
    const storagePath = doc.storage_path as string;
    const pdfUrl = `${supabaseUrl}/storage/v1/object/public/${DOCS_BUCKET}/${storagePath}`;

    try {
      // PDF aus Supabase Storage herunterladen
      const resp = await fetch(pdfUrl, {
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} fuer ${storagePath}`);
      }

      const buffer = await resp.arrayBuffer();

      // OCR mit pdf-parse
      let ocrText = "";
      let pageCount = 0;
      try {
        const parsed = await getPdfParse()(Buffer.from(buffer));
        ocrText = (parsed.text ?? "").trim();
        pageCount = parsed.numpages ?? 0;
      } catch (parseErr) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        errors.push(`OCR-Fehler ${storagePath}: ${msg}`);
      }

      // DB aktualisieren
      await admin
        .from("property_documents")
        .update({
          ocr_text: ocrText || null,
          ocr_status: (ocrText ? "done" : "failed") as "done" | "failed",
          page_count: pageCount || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", doc.id);

      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Fehler bei ${storagePath}: ${msg}`);
      await admin
        .from("property_documents")
        .update({ ocr_status: "failed" as const, processed_at: new Date().toISOString() })
        .eq("id", doc.id);
      failed++;
    }
  }

  return NextResponse.json({
    processed,
    failed,
    total: docs.length,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
