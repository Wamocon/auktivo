import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeZvgDetail } from "@/lib/crawler/scraper";
import { ensureDocsBucket, downloadPropertyDocuments } from "@/lib/crawler/documents";

export const dynamic = "force-dynamic";
// ZVG-Dokumente koennen bis zu 50 MB gross sein, Timeout grosszuegig setzen
export const maxDuration = 60;

const ZVG_BASE = "https://www.zvg-portal.de";

/** Holt einmalig einen ZVG PHPSESSID-Cookie fuer die Session. */
async function getZvgSessionCookie(): Promise<string> {
  try {
    const resp = await fetch(`${ZVG_BASE}/index.php?button=Termine%20suchen`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Auktivo/1.0; +https://auktivo.de)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const raw = resp.headers.get("set-cookie") ?? "";
    const match = /PHPSESSID=[^;,\s]+/.exec(raw);
    return match ? match[0] : "";
  } catch {
    return "";
  }
}

/** Stellt sicher dass der Bucket existiert - delegiert an shared Utility. */
// (ensureDocsBucket aus documents.ts wird direkt importiert)

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params;

  // Authentifizierung pruefen
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Objekt aus DB laden
  const { data: property, error: propError } = await admin
    .from("properties")
    .select("id, zvg_id, land_abk, document_urls")
    .eq("id", propertyId)
    .single();

  if (propError || !property) {
    return NextResponse.json({ error: "Objekt nicht gefunden" }, { status: 404 });
  }

  // zvg_id parsen: unterstuetzt "RP-3627" (Dash) und "RP_3627" (Underscore, aeltere Eintraege)
  const zvgParts = (property.zvg_id ?? "").split(/[-_]/);
  const zvgLandRaw = zvgParts.length >= 2 ? zvgParts[0] : (property.land_abk ?? "");
  const zvgNumId = zvgParts.length >= 2 ? zvgParts[1] : zvgParts[0] ?? "";
  const landAbk = (property.land_abk ?? zvgLandRaw).toUpperCase();

  if (!zvgNumId || !landAbk) {
    return NextResponse.json(
      { error: `Unvollstaendige ZVG-ID: ${property.zvg_id}` },
      { status: 400 }
    );
  }

  // ZVG-Session + Detail-Seite scrapen
  const sessionCookie = await getZvgSessionCookie();
  const detail = await scrapeZvgDetail(zvgNumId, landAbk, sessionCookie);

  // Fallback: Wenn ZVG-Portal keine Dokumente liefert (z.B. abgelaufenes Objekt),
  // gespeicherte document_urls aus der DB verwenden - Downloads koennen trotzdem klappen.
  const documentUrls: string[] =
    detail.document_urls.length > 0
      ? detail.document_urls
      : ((property.document_urls as string[]) ?? []);

  if (documentUrls.length === 0) {
    return NextResponse.json({
      count: 0,
      total: 0,
      message: "Auf dem ZVG-Portal wurden keine Dokumente fuer dieses Objekt gefunden.",
    });
  }

  // document_urls in properties-Tabelle aktualisieren (nur wenn frische URLs vom ZVG)
  if (detail.document_urls.length > 0) {
    await admin
      .from("properties")
      .update({ document_urls: documentUrls, updated_at: new Date().toISOString() })
      .eq("id", propertyId);
  }

  // Storage-Bucket sicherstellen + Basis-Eintraege anlegen
  await ensureDocsBucket(admin);
  await admin.from("property_documents").upsert(
    documentUrls.map((url) => ({
      property_id: propertyId,
      original_url: url,
      ocr_status: "pending" as const,
    })),
    { onConflict: "property_id,original_url", ignoreDuplicates: true }
  );

  // PDFs herunterladen, speichern und OCR-Text extrahieren
  const { stored, failed } = await downloadPropertyDocuments(
    propertyId,
    documentUrls,
    sessionCookie,
    admin
  );

  return NextResponse.json({
    count: stored,
    total: documentUrls.length,
    ...(failed > 0 ? { failed } : {}),
  });
}

