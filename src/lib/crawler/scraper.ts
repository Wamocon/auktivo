import { parse } from "node-html-parser";
import type { CrawlerPropertyType, ZvgEntry, ZvgLand } from "./types";
import { BUNDESLAENDER } from "@/lib/utils/bundeslaender";

const BASE_URL = "https://www.zvg-portal.de";

/**
 * Gibt den Event-Loop frei, damit der Next.js-Server auf andere
 * Requests reagieren kann waehrend der Crawler schwere HTML-Parse-Arbeit erledigt.
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// LAND_FULLNAME fuer interne Nutzung
const LAND_FULLNAME: Record<string, string> = Object.fromEntries(
  BUNDESLAENDER.map((l) => [l.short, l.name])
);

const ZVG_ID_REGEX = /zvg_id=(\d+)/;
const TERMIN_REGEX =
  /(\d{2})\.(\d{2})\.(\d{4})[,\s]+(\d{2}):(\d{2})/;
const PLZ_ORT_REGEX = /(\d{5})\s+([\wÄÖÜäöüß\s\-]+?)(?:,|$)/;

// ---------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------

async function fetchHtml(
  url: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<string> {
  const { timeoutMs = 10_000, ...fetchOptions } = options ?? {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Auktivo/1.0; +https://auktivo.de)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9",
        ...(fetchOptions?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fuer ${url}`);
    }

    // ZVG-Portal sendet ISO-8859-1
    const buffer = await response.arrayBuffer();
    return new TextDecoder("iso-8859-1").decode(buffer);
  } finally {
    clearTimeout(timeout);
  }
}

function detectPropertyType(objekt_lage: string): CrawlerPropertyType {
  const lower = objekt_lage.toLowerCase();
  if (/wohnung|etw|appartement|penthouse|eigentum/.test(lower))
    return "apartment";
  if (
    /haus|villa|bungalow|reihenhaus|doppelhaus|zweifamilienhaus|mehrfamilienhaus|einfamilienhaus/.test(
      lower
    )
  )
    return "house";
  if (
    /gewerbe|büro|buero|laden|halle|fabrik|hotel|gastronomie|lager|werkstatt/.test(
      lower
    )
  )
    return "commercial";
  if (
    /grundstück|grundstueck|erbbaurecht|acker|landwirt|forst|wald|garten|flurstück/.test(
      lower
    )
  )
    return "land";
  return "other";
}

function parseVerkehrswert(raw: string): number | null {
  // Extrahiert die ERSTE gueltige deutsche Preis-Angabe aus dem String.
  // Beispiele: "290.000 € Objekt 2: 328.000 €" -> 290000
  //            "617.000,00 ä..."               -> 617000
  //            "385.000,00 €"                  -> 385000
  //            "385000"                        -> 385000

  // Prioritaet: Tausender-Format (123.456) vor reinen Zahlen
  const match =
    /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)|(\d+(?:,\d{1,2})?)/.exec(raw);
  if (!match) return null;

  const numStr = match[1] ?? match[2];
  // Deutsches Format: Punkt = Tausender, Komma = Dezimal
  const normalized = numStr.replace(/\./g, "").replace(",", ".");
  const value = parseFloat(normalized);
  if (isNaN(value)) return null;

  const rounded = Math.round(value);
  // Cap: Werte > 100 Mrd. sind sicher Parsing-Fehler (kein Immobilien-Verkehrswert)
  if (rounded > 100_000_000_000) {
    console.warn(
      `[Scraper] Parsing-Fehler Verkehrswert: ${rounded} (raw: "${raw.slice(0, 80)}")`
    );
    return null;
  }
  return rounded;
}

function parseTermin(raw: string): Date | null {
  const match = TERMIN_REGEX.exec(raw);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  // Erstelle UTC-Datum (Amtsgerichte in Deutschland = CET/CEST)
  const isoStr = `${year}-${month}-${day}T${hour}:${minute}:00+01:00`;
  const date = new Date(isoStr);
  return isNaN(date.getTime()) ? null : date;
}

function extractPlzOrt(
  objekt_lage: string
): { plz: string | null; ort: string | null } {
  const match = PLZ_ORT_REGEX.exec(objekt_lage);
  if (!match) return { plz: null, ort: null };
  return { plz: match[1], ort: match[2].trim() };
}

function normalizeText(s: string): string {
  return s
    .replace(/\u00a0/g, " ") // Non-breaking spaces
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------
// HTML-Table-Parser (repliciert ZvgPortalScraper-Logik in TS)
// ---------------------------------------------------------------

interface RawRow {
  zvg_id_numeric?: string;
  [field: string]: string | string[] | undefined;
}

function parseHtmlTable(html: string): RawRow[] {
  const root = parse(html);
  const rows: RawRow[] = [];
  let current: RawRow = {};
  let hasData = false;

  for (const tr of root.querySelectorAll("tr")) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 2) continue;

    const title = normalizeText(tds[0].text).replace(/:$/, "");

    // Neuer Datensatz beginnt bei "Aktenzeichen" (wenn schon Daten vorhanden)
    if (title === "Aktenzeichen" && hasData) {
      rows.push(current);
      current = {};
      hasData = false;
    }

    // zvg_id aus <a href> extrahieren
    for (const a of tr.querySelectorAll("a")) {
      const href = a.getAttribute("href") ?? "";
      const match = ZVG_ID_REGEX.exec(href);
      if (match) {
        current.zvg_id_numeric = match[1];
      }
    }

    // Werte aus allen tds[1..] sammeln
    const values = tds
      .slice(1)
      .map((td) => normalizeText(td.text))
      .filter(Boolean);

    if (values.length > 0) {
      current[title] = values.length === 1 ? values[0] : values;
      hasData = true;
    }
  }

  if (hasData && Object.keys(current).length > 0) {
    rows.push(current);
  }

  return rows;
}

function rawRowToEntry(row: RawRow, land_abk: string): ZvgEntry | null {
  if (!row.zvg_id_numeric) return null;

  const amtsgericht =
    typeof row["Amtsgericht"] === "string"
      ? row["Amtsgericht"]
      : Array.isArray(row["Amtsgericht"])
        ? row["Amtsgericht"][0]
        : null;

  if (!amtsgericht) return null;

  const zvg_id = `${land_abk.toUpperCase()}-${row.zvg_id_numeric}`;

  const objekt_lage =
    typeof row["Objekt/Lage"] === "string"
      ? row["Objekt/Lage"]
      : Array.isArray(row["Objekt/Lage"])
        ? row["Objekt/Lage"].join(" ")
        : null;

  const verkehrswertRaw =
    typeof row["Verkehrswert in €"] === "string"
      ? row["Verkehrswert in €"]
      : Array.isArray(row["Verkehrswert in €"])
        ? row["Verkehrswert in €"][0]
        : null;

  const terminRaw =
    typeof row["Termin"] === "string"
      ? row["Termin"]
      : Array.isArray(row["Termin"])
        ? row["Termin"][0]
        : null;

  const aktenzeichen =
    typeof row["Aktenzeichen"] === "string"
      ? row["Aktenzeichen"]
      : Array.isArray(row["Aktenzeichen"])
        ? row["Aktenzeichen"][0]
        : null;

  const { plz, ort } = objekt_lage
    ? extractPlzOrt(objekt_lage)
    : { plz: null, ort: null };

  // Adresse = erster Teil vor dem Komma
  const adresse = objekt_lage
    ? objekt_lage.split(",")[0]?.trim() ?? null
    : null;

  return {
    zvg_id,
    zvg_id_numeric: row.zvg_id_numeric,
    land_abk,
    aktenzeichen: aktenzeichen ?? null,
    amtsgericht,
    objekt_lage: objekt_lage ?? null,
    adresse,
    plz,
    ort,
    state: LAND_FULLNAME[land_abk] ?? null,
    verkehrswert_eur: verkehrswertRaw
      ? parseVerkehrswert(verkehrswertRaw)
      : null,
    termin: terminRaw ? parseTermin(terminRaw) : null,
    document_urls: [],
    property_type: objekt_lage ? detectPropertyType(objekt_lage) : "other",
    // Detail-Felder: werden spaeter durch scrapeZvgDetail gefuellt
    art_versteigerung: null,
    grundbuch: null,
    beschreibung: null,
    versteigerungsort: null,
    glaeubigerinfo: null,
    geoserver_url: null,
  };
}

// ---------------------------------------------------------------
// Detail-Seite Scraper
// ---------------------------------------------------------------

export interface ZvgDetailData {
  art_versteigerung: string | null;
  grundbuch: string | null;
  beschreibung: string | null;
  versteigerungsort: string | null;
  glaeubigerinfo: string | null;
  geoserver_url: string | null;
  document_urls: string[];
}

/**
 * Scraped die Detailseite eines einzelnen ZVG-Objekts.
 * URL-Muster: /index.php?button=showZvg&zvg_id={id}&land_abk={abk}
 */
export async function scrapeZvgDetail(
  zvg_id_numeric: string,
  land_abk: string
): Promise<ZvgDetailData> {
  const url = `${BASE_URL}/index.php?button=showZvg&zvg_id=${zvg_id_numeric}&land_abk=${land_abk}`;
  const result: ZvgDetailData = {
    art_versteigerung: null,
    grundbuch: null,
    beschreibung: null,
    versteigerungsort: null,
    glaeubigerinfo: null,
    geoserver_url: null,
    document_urls: [],
  };

  let html: string;
  try {
    html = await fetchHtml(url, { timeoutMs: 8_000 }); // kurzes Timeout fuer Detail-Seiten
  } catch {
    return result;
  }

  // Event-Loop freigeben bevor schweres synchrones HTML-Parsing beginnt
  await yieldToEventLoop();
  const root = parse(html);

  for (const tr of root.querySelectorAll("tr")) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 2) continue;

    const label = normalizeText(tds[0].text).replace(/:$/, "").toLowerCase();
    const valueCell = tds[1];
    const value = normalizeText(valueCell.text);

    // Textfelder extrahieren (case-insensitive, umlaut-tolerant)
    if (/art der versteigerung|versteigerungsart/.test(label)) {
      result.art_versteigerung = value || null;
    } else if (/grundbuch/.test(label)) {
      result.grundbuch = value || null;
    } else if (/beschreibung/.test(label)) {
      result.beschreibung = value || null;
    } else if (/ort der versteigerung|versteigerungsort/.test(label)) {
      result.versteigerungsort = value || null;
    } else if (/gl.ubiger|gl.ubigerinformation/.test(label)) {
      result.glaeubigerinfo = value !== "keine Angaben" ? value || null : null;
    }

    // GeoServer-Link
    const geoLink = valueCell.querySelector("a[href*='geoserver'], a[href*='geoportal'], a[href*='gis'], a[href*='karten']");
    if (geoLink) {
      const href = geoLink.getAttribute("href") ?? "";
      result.geoserver_url = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
    }

    // PDF-Links (amtl. Bekanntmachung, Exposee, Gutachten, Beschluss, etc.)
    for (const a of valueCell.querySelectorAll("a")) {
      const href = a.getAttribute("href") ?? "";
      const linkText = normalizeText(a.text).toLowerCase();

      const isPdf =
        href.toLowerCase().includes(".pdf") ||
        href.toLowerCase().includes("showdoc") ||
        href.toLowerCase().includes("download") ||
        /bekanntmachung|expos|gutachten|beschluss|dokument|anlage/.test(linkText);

      if (isPdf && href) {
        let absoluteUrl: string;
        if (href.startsWith("http")) {
          absoluteUrl = href;
        } else if (href.startsWith("/")) {
          absoluteUrl = `${BASE_URL}${href}`;
        } else {
          absoluteUrl = `${BASE_URL}/${href}`;
        }
        if (!result.document_urls.includes(absoluteUrl)) {
          result.document_urls.push(absoluteUrl);
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------
// Oeffentliche API
// ---------------------------------------------------------------

/**
 * Scraped alle Zwangsversteigerungstermine fuer ein Bundesland.
 * Gibt eine leere Liste zurueck bei Fehlern (kein Crash des Runners).
 */
export async function scrapeZvgLand(land: ZvgLand): Promise<ZvgEntry[]> {
  const url = `${BASE_URL}/index.php`;
  const params = new URLSearchParams({ button: "Suchen", all: "1" });

  const body = new URLSearchParams({
    ger_name: "-- Alle Amtsgerichte --",
    order_by: "2",
    land_abk: land.short,
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

  const html = await fetchHtml(`${url}?${params.toString()}`, {
    method: "POST",
    body: body.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${BASE_URL}/index.php?button=Termine%20suchen`,
    },
  });

  // Event-Loop freigeben bevor synchrones HTML-Parsing
  await yieldToEventLoop();
  const rawRows = parseHtmlTable(html);
  const entries: ZvgEntry[] = [];

  for (const row of rawRows) {
    const entry = rawRowToEntry(row, land.short);
    if (entry) entries.push(entry);
  }

  return entries;
}
