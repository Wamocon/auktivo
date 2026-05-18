/**
 * Admin-Endpoint: Detail-Anreicherung fuer unangereicherte Properties.
 *
 * Verarbeitet bis zu BATCH_SIZE Properties pro Call (Standard: 30).
 * Jeder Call dauert ~60-90s (3 concurrent, 500ms Pause) - passt in maxDuration=120s.
 * Kann wiederholt aufgerufen werden bis remaining=0.
 *
 * POST /api/admin/crawler/enrich
 * POST /api/admin/crawler/enrich?batch=50  (groesserer Batch, max 60)
 *
 * Angereichert werden: beschreibung, grundbuch, art_versteigerung,
 * versteigerungsort, glaeubigerinfo, geoserver_url, document_urls, Dokumente+OCR.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeZvgDetail } from "@/lib/crawler/scraper";
import { ensureDocsBucket, downloadPropertyDocuments } from "@/lib/crawler/documents";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_BATCH = 30;
const MAX_BATCH = 60;
const CONCURRENCY = 3;
const PAUSE_MS = 500;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function getZvgSession(): Promise<string> {
  try {
    const resp = await fetch(
      "https://www.zvg-portal.de/index.php?button=Termine%20suchen",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Auktivo/1.0; +https://auktivo.de)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "de-DE,de;q=0.9",
        },
      }
    );
    const cookie = resp.headers.get("set-cookie") ?? "";
    const match = /PHPSESSID=[^;,\s]+/.exec(cookie);
    return match ? match[0] : "";
  } catch {
    return "";
  }
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

  const { searchParams } = new URL(request.url);
  const batchSize = Math.min(
    parseInt(searchParams.get("batch") ?? String(DEFAULT_BATCH), 10) || DEFAULT_BATCH,
    MAX_BATCH
  );

  const admin = createAdminClient();

  // Properties holen, die noch nicht angereichert wurden (keine Beschreibung)
  // Fallback: auch Properties die zuletzt vor >24h gecrawlt wurden und immer noch
  // keine Beschreibung haben werden erneut versucht.
  const { data: props, error: propsErr } = await admin
    .from("properties")
    .select("id, zvg_id, land_abk")
    .is("beschreibung", null)
    .not("land_abk", "is", null)
    .order("last_crawled_at", { ascending: true })
    .limit(batchSize);

  if (propsErr) {
    return NextResponse.json({ error: propsErr.message }, { status: 500 });
  }

  // Anzahl verbleibender Properties zaehlen
  const { count: remaining } = await admin
    .from("properties")
    .select("id", { count: "exact", head: true })
    .is("beschreibung", null)
    .not("land_abk", "is", null);

  if (!props?.length) {
    return NextResponse.json({ processed: 0, failed: 0, remaining: 0 });
  }

  const sessionCookie = await getZvgSession();
  await ensureDocsBucket(admin);

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < props.length; i += CONCURRENCY) {
    const batch = props.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (prop) => {
        try {
          // zvg_id_numeric: numerischer Teil aus "LAND-12345" extrahieren
          const parts = prop.zvg_id.split("-");
          const zvgNumId = parts[parts.length - 1];
          const landAbk = prop.land_abk as string;

          const detail = await scrapeZvgDetail(zvgNumId, landAbk, sessionCookie);

          // Detail-Felder updaten
          const update: Record<string, unknown> = {
            art_versteigerung: detail.art_versteigerung,
            grundbuch: detail.grundbuch,
            beschreibung: detail.beschreibung ?? "",   // Leerstring = "versucht, nichts gefunden"
            versteigerungsort: detail.versteigerungsort,
            glaeubigerinfo: detail.glaeubigerinfo,
            geoserver_url: detail.geoserver_url,
            last_crawled_at: new Date().toISOString(),
          };
          if (detail.document_urls.length > 0) {
            update.document_urls = detail.document_urls;
          }
          if (detail.termin) {
            update.auction_date = detail.termin.toISOString();
          }

          await admin.from("properties").update(update).eq("zvg_id", prop.zvg_id);

          // Dokumente herunterladen wenn vorhanden
          if (detail.document_urls.length > 0) {
            await admin.from("property_documents").upsert(
              detail.document_urls.map((url) => ({
                property_id: prop.id,
                original_url: url,
                ocr_status: "pending" as const,
              })),
              { onConflict: "property_id,original_url", ignoreDuplicates: true }
            );
            await downloadPropertyDocuments(
              prop.id as string,
              detail.document_urls,
              sessionCookie,
              admin
            );
          }

          processed++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[Enrich] Fehler bei ${prop.zvg_id}:`, msg);
          // last_crawled_at trotzdem updaten um Endlos-Retry zu verhindern
          await admin
            .from("properties")
            .update({ last_crawled_at: new Date().toISOString() })
            .eq("zvg_id", prop.zvg_id);
          failed++;
        }
      })
    );

    if (i + CONCURRENCY < props.length) {
      await sleep(PAUSE_MS);
    }
  }

  const newRemaining = Math.max(0, (remaining ?? 0) - processed);

  return NextResponse.json({
    processed,
    failed,
    remaining: newRemaining,
  });
}
