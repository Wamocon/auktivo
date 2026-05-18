/**
 * Geteilte Logik fuer die stapelweise Detail-Anreicherung von Properties.
 *
 * Wird genutzt von:
 * - /api/crawler/enrich      (automatisch, CRON_SECRET, selbst-kettend)
 * - /api/admin/crawler/enrich (manuell, Admin-Auth, Browser-seitig kettend)
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeZvgDetail } from "./scraper";
import { ensureDocsBucket, downloadPropertyDocuments } from "./documents";

const CONCURRENCY = 3;
const PAUSE_MS = 500;

export interface EnrichBatchResult {
  processed: number;
  failed: number;
  /** Anzahl Properties die nach diesem Batch noch fehlen. */
  remaining: number;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function getZvgSession(): Promise<string> {
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

/**
 * Reichert einen Batch von bis zu `batchSize` Properties mit Detail-Daten an.
 * Wählt automatisch Properties aus, die noch keine `beschreibung` haben.
 *
 * @param batchSize  Anzahl Properties pro Aufruf (empfohlen: 30-50)
 * @returns { processed, failed, remaining }
 */
export async function enrichPropertiesBatch(
  batchSize: number
): Promise<EnrichBatchResult> {
  const admin = createAdminClient();

  const { data: props, error: propsErr } = await admin
    .from("properties")
    .select("id, zvg_id, land_abk")
    .is("beschreibung", null)
    .not("land_abk", "is", null)
    .order("last_crawled_at", { ascending: true })
    .limit(batchSize);

  if (propsErr) {
    console.error("[Enricher] Fehler beim Laden der Properties:", propsErr.message);
    return { processed: 0, failed: 0, remaining: 0 };
  }

  const { count: totalRemaining } = await admin
    .from("properties")
    .select("id", { count: "exact", head: true })
    .is("beschreibung", null)
    .not("land_abk", "is", null);

  if (!props?.length) {
    return { processed: 0, failed: 0, remaining: 0 };
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
          const parts = prop.zvg_id.split("-");
          const zvgNumId = parts[parts.length - 1];
          const landAbk = prop.land_abk as string;

          const detail = await scrapeZvgDetail(zvgNumId, landAbk, sessionCookie);

          const update: Record<string, unknown> = {
            art_versteigerung: detail.art_versteigerung,
            grundbuch: detail.grundbuch,
            // Leerstring = "versucht, nichts gefunden" - verhindert erneutes Scrapen
            beschreibung: detail.beschreibung ?? "",
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
          console.error(
            `[Enricher] Fehler bei ${prop.zvg_id}:`,
            err instanceof Error ? err.message : String(err)
          );
          // last_crawled_at updaten - verhindert Endlos-Retry heute
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

  // Verbleibende nach diesem Batch = Gesamt - gerade verarbeitete
  const remaining = Math.max(0, (totalRemaining ?? 0) - processed);

  return { processed, failed, remaining };
}
