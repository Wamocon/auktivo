/**
 * Standalone ZVG-Crawler (TypeScript via tsx)
 * Ausfuehren: npx --yes tsx scripts/run-crawler.ts
 *
 * Laedt alle Zwangsversteigerungsobjekte von zvg-portal.de in die
 * Supabase-Datenbank (Schema: auktivo_dev).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// .env.local laden (ohne dotenv-Paket)
// ---------------------------------------------------------------------------
function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
    console.log("[Crawler] .env.local geladen");
  } catch {
    console.log("[Crawler] Kein .env.local gefunden – nutze Prozess-Env");
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54331";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SCHEMA = process.env.SUPABASE_DB_SCHEMA ?? "public";
const RATE_LIMIT_MS = 2_000;
const BASE_URL = "https://www.zvg-portal.de";

if (!SERVICE_ROLE_KEY) {
  console.error("[Crawler] SUPABASE_SERVICE_ROLE_KEY fehlt!");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: SCHEMA },
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Bundeslaender
// ---------------------------------------------------------------------------
const BUNDESLAENDER = [
  { short: "bw", name: "Baden-Württemberg" },
  { short: "by", name: "Bayern" },
  { short: "be", name: "Berlin" },
  { short: "bb", name: "Brandenburg" },
  { short: "hb", name: "Bremen" },
  { short: "hh", name: "Hamburg" },
  { short: "he", name: "Hessen" },
  { short: "mv", name: "Mecklenburg-Vorpommern" },
  { short: "ni", name: "Niedersachsen" },
  { short: "nw", name: "Nordrhein-Westfalen" },
  { short: "rp", name: "Rheinland-Pfalz" },
  { short: "sl", name: "Saarland" },
  { short: "sn", name: "Sachsen" },
  { short: "st", name: "Sachsen-Anhalt" },
  { short: "sh", name: "Schleswig-Holstein" },
  { short: "th", name: "Thüringen" },
];

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchZvgHtml(land_abk: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const params = new URLSearchParams({ button: "Suchen", all: "1" });
    const body = new URLSearchParams({
      ger_name: "-- Alle Amtsgerichte --",
      order_by: "2",
      land_abk,
      ger_id: "0",
      az1: "",
      az2: "",
      az3: "",
      az4: "",
      art: "",
      obj: "",
      str: "",
      hnr: "",
      plz: "",
      ort: "",
      ortsteil: "",
      vtermin: "",
      btermin: "",
    });

    const res = await fetch(`${BASE_URL}/index.php?${params}`, {
      method: "POST",
      body: body.toString(),
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (compatible; Auktivo/1.0; +https://auktivo.de)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9",
        Referer: `${BASE_URL}/index.php?button=Termine%20suchen`,
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // ZVG-Portal sendet ISO-8859-1
    const buf = await res.arrayBuffer();
    return new TextDecoder("iso-8859-1").decode(buf);
  } finally {
    clearTimeout(timer);
  }
}

const ZVG_ID_REGEX = /zvg_id=(\d+)/;
const TERMIN_REGEX =
  /(\d{2})\.(\d{2})\.(\d{4})[,\s]+(\d{2}):(\d{2})/;
const PLZ_REGEX = /(\d{5})\s+([\wÄÖÜäöüß\s\-]+?)(?:,|$)/;

function parseVerkehrswert(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const value = parseFloat(normalized);
  if (isNaN(value) || value > 9_000_000_000_000) return null;
  return Math.round(value);
}

function parseTermin(raw: string): string | null {
  const m = TERMIN_REGEX.exec(raw);
  if (!m) return null;
  const [, day, month, year, hour, min] = m;
  return `${year}-${month}-${day}T${hour}:${min}:00+01:00`;
}

function detectType(text: string): string {
  const t = text.toLowerCase();
  if (/wohnung|etw|appartement|penthouse/.test(t)) return "apartment";
  if (/haus|villa|bungalow|reihenhaus|einfamilienhaus|mehrfamilienhaus/.test(t))
    return "house";
  if (/gewerbe|büro|laden|halle|fabrik|hotel/.test(t)) return "commercial";
  if (/grundstück|grundstueck|erbbaurecht|acker|wald|garten/.test(t))
    return "land";
  return "other";
}

// ---------------------------------------------------------------------------
// HTML-Parser (Key-Value Tabelle des ZVG-Portals)
// ---------------------------------------------------------------------------
function parseZvgHtml(html: string, land_abk: string) {
  // Einfaches Regex-basiertes Parsing der ZVG-Tabellen
  const entries: object[] = [];

  // Jeder Eintrag beginnt mit einem <a>-Tag mit zvg_id und endet beim naechsten
  const entryChunks = html.split(/(?=<a[^>]+zvg_id=)/i);

  for (const chunk of entryChunks) {
    const idMatch = ZVG_ID_REGEX.exec(chunk);
    if (!idMatch) continue;
    const zvg_id_num = idMatch[1];
    const zvg_id = `${land_abk.toUpperCase()}-${zvg_id_num}`;

    // Plain text aus dem chunk extrahieren
    const text = chunk
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&auml;/g, "ä")
      .replace(/&ouml;/g, "ö")
      .replace(/&uuml;/g, "ü")
      .replace(/&Auml;/g, "Ä")
      .replace(/&Ouml;/g, "Ö")
      .replace(/&Uuml;/g, "Ü")
      .replace(/&szlig;/g, "ß")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    if (!text || text.length < 20) continue;

    // Amtsgericht
    const agMatch = /Amtsgericht\s+([A-ZÄÖÜ][^,\n]+)/i.exec(text);
    const amtsgericht = agMatch?.[1]?.trim() ?? land_abk.toUpperCase();

    // Termin
    const termin = parseTermin(text);

    // Objekt/Lage (zwischen "Objekt" und "Verkehrswert" oder "Aktenzeichen")
    const objMatch =
      /(?:Objekt\/Lage|Objekt)\s*:?\s*([^]+?)(?:Verkehrswert|Gutachten|Aktenzeichen|$)/i.exec(
        text
      );
    const objekt_lage = objMatch?.[1]?.replace(/\s+/g, " ")?.trim() ?? text.slice(0, 100);

    // Verkehrswert
    const wertMatch =
      /Verkehrswert[^:]*:\s*([\d.,]+)\s*(?:EUR|€)?/i.exec(text);
    const market_value = wertMatch ? parseVerkehrswert(wertMatch[1]) : null;

    // PLZ + Ort
    const plzMatch = PLZ_REGEX.exec(objekt_lage);
    const zip_code = plzMatch?.[1] ?? null;
    const city = plzMatch?.[2]?.trim() ?? null;

    // Adresse
    const address = objekt_lage.split(",")[0]?.trim() ?? null;

    // Aktenzeichen
    const azMatch = /Aktenzeichen\s*:?\s*([^\s,]+\s*\w+)/i.exec(text);
    const court_file_number = azMatch?.[1]?.trim() ?? null;

    entries.push({
      zvg_id,
      court: amtsgericht,
      court_file_number,
      auction_date: termin,
      property_type: detectType(objekt_lage),
      address,
      city,
      zip_code: zip_code ?? "00000",
      state: BUNDESLAENDER.find((b) => b.short === land_abk)?.name ?? land_abk,
      market_value,
      minimum_bid: market_value ? Math.round(market_value * 0.5) : null,
      document_urls: [],
      status: "active",
      last_crawled_at: new Date().toISOString(),
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Hauptprogramm
// ---------------------------------------------------------------------------
async function main() {
  const startTime = Date.now();
  console.log(`[Crawler] Schema:   ${SCHEMA}`);
  console.log(`[Crawler] Supabase: ${SUPABASE_URL}`);

  // DB-Verbindung testen
  const { error: connErr } = await admin.from("crawler_runs").select("id").limit(1);
  if (connErr) {
    console.error("[Crawler] Verbindungsfehler:", connErr.message);
    process.exit(1);
  }
  console.log("[Crawler] Datenbankverbindung OK\n");

  // Crawler-Run anlegen
  const { data: run, error: runErr } = await admin
    .from("crawler_runs")
    .insert({ status: "running", started_at: new Date().toISOString() })
    .select()
    .single();

  if (runErr || !run) {
    console.error("[Crawler] Kann crawler_run nicht anlegen:", runErr?.message);
    process.exit(1);
  }
  console.log(`[Crawler] Run-ID: ${run.id}\n`);

  let totalScraped = 0;
  let totalInserted = 0;
  let totalErrors = 0;

  for (const land of BUNDESLAENDER) {
    process.stdout.write(`[Crawler] ${land.name.padEnd(26)} ... `);

    let entries: object[] = [];
    try {
      const html = await fetchZvgHtml(land.short);
      entries = parseZvgHtml(html, land.short);
    } catch (e) {
      console.log(`FEHLER (${(e as Error).message})`);
      totalErrors++;
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    console.log(`${entries.length} Objekte`);
    totalScraped += entries.length;

    for (const entry of entries) {
      const { error } = await admin.from("properties").upsert(entry as object, {
        onConflict: "zvg_id",
        ignoreDuplicates: false,
      });
      if (error) {
        totalErrors++;
        console.error(`  Upsert-Fehler:`, error.message);
      } else {
        totalInserted++;
      }
    }

    await sleep(RATE_LIMIT_MS);
  }

  // Crawler-Run abschliessen
  await admin
    .from("crawler_runs")
    .update({
      status: totalErrors > totalScraped * 0.5 ? "failed" : "completed",
      finished_at: new Date().toISOString(),
      new_properties_count: totalInserted,
      updated_properties_count: 0,
      error_message: totalErrors > 0 ? `${totalErrors} Fehler` : null,
    })
    .eq("id", run.id);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[Crawler] Fertig in ${duration}s`);
  console.log(`[Crawler] Gescraped:   ${totalScraped}`);
  console.log(`[Crawler] Gespeichert: ${totalInserted}`);
  console.log(`[Crawler] Fehler:      ${totalErrors}`);
}

main().catch((e) => {
  console.error("[Crawler] Kritischer Fehler:", e);
  process.exit(1);
});
