/**
 * Gemeinsame Logik fuer den PDF-Download vom ZVG-Portal,
 * Speicherung in Supabase Storage und KI-fähige Text-Extraktion.
 *
 * Wird vom Crawler (runner.ts) und von der On-Demand-API genutzt.
 */
import type { createAdminClient } from "@/lib/supabase/admin";

export const DOCS_BUCKET = "property-docs";
const ZVG_BASE = "https://www.zvg-portal.de";
// 50 MB - grosszuegig genug fuer amtliche Gutachten
const MAX_PDF_BYTES = 52_428_800;
// Timeout pro Dokument-Download
const DOWNLOAD_TIMEOUT_MS = 45_000;

// pdf-parse ist ein CJS-Modul - require() umgeht ESM-Default-Export-Problem
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

export interface PdfDownloadResult {
  /** Wurde das Dokument erfolgreich gespeichert? */
  stored: boolean;
  /** Extrahierter Klartext (leer wenn Extraktion fehlschlug). */
  ocrText: string;
  /** Seitenzahl aus der PDF-Metadatei. */
  pageCount: number;
  /** Dateigroesse in Bytes. */
  byteSize: number;
  /** Fehlerbeschreibung bei stored=false. */
  error?: string;
}

/**
 * Laedt ein PDF vom ZVG-Portal herunter, speichert es in Supabase Storage
 * und extrahiert den Volltext fuer KI-Chatbot und Risikoanalyse.
 *
 * @param url           Direkte Dokument-URL vom ZVG-Portal
 * @param storagePath   Pfad im Bucket, z.B. "{propertyId}/doc-1.pdf"
 * @param sessionCookie Aktiver PHPSESSID-Cookie fuer ZVG-Portal-Session
 * @param admin         Supabase Admin-Client (Schema-unabhaengig fuer Storage)
 */
export async function downloadAndStorePdf(
  url: string,
  storagePath: string,
  sessionCookie: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<PdfDownloadResult> {
  try {
    const pdfResp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Auktivo/1.0; +https://auktivo.de)",
        Accept: "application/pdf,*/*",
        Referer: `${ZVG_BASE}/`,
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });

    if (!pdfResp.ok) {
      return { stored: false, ocrText: "", pageCount: 0, byteSize: 0, error: `HTTP ${pdfResp.status}` };
    }

    const contentType = pdfResp.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      // ZVG gibt HTML-Fehlerseite zurueck - Session ist abgelaufen oder URL ungueltig
      return { stored: false, ocrText: "", pageCount: 0, byteSize: 0, error: "Session abgelaufen oder ungueltige URL" };
    }

    const buffer = await pdfResp.arrayBuffer();

    if (buffer.byteLength < 100) {
      return { stored: false, ocrText: "", pageCount: 0, byteSize: 0, error: "Leere Antwort" };
    }
    if (buffer.byteLength > MAX_PDF_BYTES) {
      return { stored: false, ocrText: "", pageCount: 0, byteSize: buffer.byteLength, error: "Datei zu gross (>50 MB)" };
    }

    // In Supabase Storage hochladen (upsert = idempotent bei Neustarts)
    const { error: uploadError } = await admin.storage
      .from(DOCS_BUCKET)
      .upload(storagePath, Buffer.from(buffer), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return { stored: false, ocrText: "", pageCount: 0, byteSize: buffer.byteLength, error: uploadError.message };
    }

    // Volltext extrahieren - fuer KI-Chatbot und Risikoanalyse
    let ocrText = "";
    let pageCount = 0;
    try {
      const parsed = await pdfParse(Buffer.from(buffer));
      ocrText = (parsed.text ?? "").trim();
      pageCount = parsed.numpages ?? 0;
    } catch {
      // Textextraktion schlaegt fehl bei reinen Scan-PDFs ohne Text-Layer
      // Dokument ist trotzdem gespeichert - visuell lesbar im PDF-Viewer
    }

    return { stored: true, ocrText, pageCount, byteSize: buffer.byteLength };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Timeout bei AbortError spezifisch benennen
    if (err instanceof Error && err.name === "AbortError") {
      return { stored: false, ocrText: "", pageCount: 0, byteSize: 0, error: "Timeout (>45s)" };
    }
    return { stored: false, ocrText: "", pageCount: 0, byteSize: 0, error: msg };
  }
}

/**
 * Stellt sicher dass der Supabase Storage Bucket existiert (idempotent).
 * Public bucket - ZVG-Dokumente sind ohnehin oeffentlich zugaengliche Amtsdokumente.
 */
export async function ensureDocsBucket(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const { error } = await admin.storage.createBucket(DOCS_BUCKET, {
    public: true,
    fileSizeLimit: MAX_PDF_BYTES,
    allowedMimeTypes: ["application/pdf"],
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    console.warn(`[Docs] Bucket-Erstellung fehlgeschlagen: ${error.message}`);
  }
}

/**
 * Laedt alle Dokumente einer Property herunter, die noch keinen storage_path haben.
 * Gibt die Anzahl erfolgreich gespeicherter Dokumente zurueck.
 *
 * @param propertyId    UUID der Property
 * @param documentUrls  Liste der ZVG-Dokument-URLs
 * @param sessionCookie Aktiver PHPSESSID-Cookie
 * @param admin         Supabase Admin-Client
 */
export async function downloadPropertyDocuments(
  propertyId: string,
  documentUrls: string[],
  sessionCookie: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<{ stored: number; failed: number }> {
  if (!documentUrls.length) return { stored: 0, failed: 0 };

  // Welche URLs haben bereits einen storage_path? (Idempotenz)
  const { data: existingDocs } = await admin
    .from("property_documents")
    .select("original_url, storage_path")
    .eq("property_id", propertyId)
    .in("original_url", documentUrls);

  const alreadyStored = new Set(
    (existingDocs ?? []).filter((d) => d.storage_path).map((d) => d.original_url)
  );

  let stored = 0;
  let failed = 0;

  for (let i = 0; i < documentUrls.length; i++) {
    const url = documentUrls[i];
    if (alreadyStored.has(url)) {
      stored++; // Bereits gespeichert - zaehlt als erfolgreich
      continue;
    }

    const storagePath = `${propertyId}/doc-${i + 1}.pdf`;
    const result = await downloadAndStorePdf(url, storagePath, sessionCookie, admin);

    if (result.stored) {
      await admin
        .from("property_documents")
        .update({
          storage_path: storagePath,
          ocr_text: result.ocrText || null,
          ocr_status: (result.ocrText ? "done" : "failed") as "done" | "failed",
          file_size_bytes: result.byteSize,
          page_count: result.pageCount || null,
          processed_at: new Date().toISOString(),
        })
        .eq("property_id", propertyId)
        .eq("original_url", url);
      stored++;
    } else {
      await admin
        .from("property_documents")
        .update({
          ocr_status: "failed" as const,
          processed_at: new Date().toISOString(),
        })
        .eq("property_id", propertyId)
        .eq("original_url", url);
      failed++;
      console.warn(`[Docs] Download fehlgeschlagen: ${url} - ${result.error}`);
    }
  }

  return { stored, failed };
}
