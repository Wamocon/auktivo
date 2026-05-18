/**
 * Geo-Enrichment: Holt kostenlose Standortdaten zu einer Immobilie.
 *
 * Quellen:
 *  - Nominatim (OpenStreetMap) - Geocoding + Adressdetails
 *  - Overpass API               - POIs im Umkreis (Schulen, Arzte, Verkehr, ...)
 *  - Wikipedia DE               - Stadt-Zusammenfassung
 */

const USER_AGENT = "Auktivo/1.0 (https://auktivo.de)";

// ---------------------------------------------------------------
// Typen
// ---------------------------------------------------------------

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    quarter?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface POI {
  id: number;
  name: string;
  type: string;
  category: "school" | "health" | "transport" | "shop" | "leisure" | "other";
  lat: number;
  lon: number;
  distanceM: number;
}

export interface GeoEnrichmentData {
  /** Geocodierte Koordinaten */
  lat: number | null;
  lon: number | null;
  /** Volle Adresse von Nominatim */
  displayName: string | null;
  /** Stadtteil / Ortsteil */
  neighborhood: string | null;
  /** Landkreis */
  county: string | null;
  /** Points of Interest im Umkreis */
  pois: POI[];
  /** Wikipedia-Zusammenfassung der Stadt */
  wikipediaSummary: string | null;
  wikipediaUrl: string | null;
}

// ---------------------------------------------------------------
// Nominatim - Geocoding
// ---------------------------------------------------------------

async function fetchNominatim(query: string): Promise<NominatimResult | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&countrycodes=de`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "de" },
      next: { revalidate: 86_400 }, // 24h Next.js-Cache
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult[];
    return data[0] ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// Overpass API - POIs im Umkreis
// ---------------------------------------------------------------

async function fetchOverpassPOIs(lat: number, lon: number, radiusM = 700): Promise<POI[]> {
  const overpassQuery = `
[out:json][timeout:12];
(
  node["amenity"~"^(school|kindergarten|university|hospital|clinic|pharmacy|doctors|dentist|bus_station)$"](around:${radiusM},${lat},${lon});
  node["public_transport"="stop_position"](around:${radiusM},${lat},${lon});
  node["highway"="bus_stop"](around:${radiusM},${lat},${lon});
  node["railway"~"^(station|halt|tram_stop)$"](around:${radiusM},${lat},${lon});
  node["shop"~"^(supermarket|convenience|bakery|grocery)$"](around:${radiusM},${lat},${lon});
  node["leisure"~"^(park|playground|sports_centre)$"](around:${radiusM},${lat},${lon});
);
out center 40;
  `.trim();

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      next: { revalidate: 3_600 }, // 1h Cache
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { elements: OverpassElement[] };

    return data.elements
      .filter((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        return el.tags && elLat != null && elLon != null;
      })
      .map((el) => {
        const elLat = (el.lat ?? el.center?.lat)!;
        const elLon = (el.lon ?? el.center?.lon)!;
        const tags = el.tags!;
        return {
          id: el.id,
          name: tags.name ?? tags["name:de"] ?? tags.operator ?? "",
          type:
            tags.amenity ??
            tags.public_transport ??
            tags.railway ??
            tags.highway ??
            tags.shop ??
            tags.leisure ??
            "other",
          category: categorize(tags),
          lat: elLat,
          lon: elLon,
          distanceM: haversine(lat, lon, elLat, elLon),
        };
      })
      .filter((p) => p.name.length > 0)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 30);
  } catch {
    return [];
  }
}

function categorize(tags: Record<string, string>): POI["category"] {
  const a = tags.amenity ?? "";
  const pt = tags.public_transport ?? tags.railway ?? tags.highway ?? "";
  const s = tags.shop ?? "";
  const l = tags.leisure ?? "";

  if (/school|kindergarten|university|hochschule/.test(a)) return "school";
  if (/hospital|clinic|pharmacy|doctors|dentist|apotheke/.test(a)) return "health";
  if (pt || /bus|taxi/.test(a)) return "transport";
  if (s) return "shop";
  if (l) return "leisure";
  return "other";
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ---------------------------------------------------------------
// Wikipedia DE - Stadtbeschreibung
// ---------------------------------------------------------------

async function fetchWikipedia(
  cityName: string
): Promise<{ summary: string; url: string } | null> {
  try {
    const url = `https://de.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
      type?: string;
    };
    if (data.type === "disambiguation" || !data.extract) return null;
    return {
      summary: data.extract,
      url:
        data.content_urls?.desktop?.page ??
        `https://de.wikipedia.org/wiki/${encodeURIComponent(cityName)}`,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// Oeffentliche Funktion
// ---------------------------------------------------------------

/**
 * Reichert Immobiliendaten mit kostenlosen Geodaten an.
 * Nutzt Next.js fetch-Cache (revalidate).
 */
export async function enrichPropertyLocation(params: {
  address: string | null;
  zipCode: string;
  city: string | null;
  lat: number | null;
  lon: number | null;
}): Promise<GeoEnrichmentData> {
  const { address, zipCode, city, lat, lon } = params;

  let finalLat = lat;
  let finalLon = lon;
  let displayName: string | null = null;
  let neighborhood: string | null = null;
  let county: string | null = null;

  // Geocoding nur wenn keine Koordinaten vorhanden - mehrstufiger Fallback
  if (!finalLat || !finalLon) {
    // Stufe 1: Volle Adresse (Strasse + PLZ + Stadt)
    if (address && zipCode && city) {
      const query = `${address}, ${zipCode} ${city}, Deutschland`;
      const geo = await fetchNominatim(query);
      if (geo) {
        finalLat = parseFloat(geo.lat);
        finalLon = parseFloat(geo.lon);
        displayName = geo.display_name;
        neighborhood = geo.address.suburb ?? geo.address.quarter ?? geo.address.village ?? null;
        county = geo.address.county ?? null;
      }
    }

    // Stufe 2: PLZ + Stadt (ohne Strasse)
    if (!finalLat && zipCode && city) {
      const geo = await fetchNominatim(`${zipCode} ${city}, Deutschland`);
      if (geo) {
        finalLat = parseFloat(geo.lat);
        finalLon = parseFloat(geo.lon);
        displayName = geo.display_name;
        neighborhood = null;
        county = geo.address.county ?? null;
      }
    }

    // Stufe 3: Nur PLZ
    if (!finalLat && zipCode) {
      const geo = await fetchNominatim(`${zipCode}, Deutschland`);
      if (geo) {
        finalLat = parseFloat(geo.lat);
        finalLon = parseFloat(geo.lon);
        displayName = geo.display_name;
        neighborhood = null;
        county = geo.address.county ?? null;
      }
    }

    // Stufe 4: Nur Stadt
    if (!finalLat && city) {
      const geo = await fetchNominatim(`${city}, Deutschland`);
      if (geo) {
        finalLat = parseFloat(geo.lat);
        finalLon = parseFloat(geo.lon);
        displayName = geo.display_name;
        neighborhood = null;
        county = geo.address.county ?? null;
      }
    }
  }

  // POIs + Wikipedia parallel abfragen
  const [pois, wikiData] = await Promise.all([
    finalLat && finalLon
      ? fetchOverpassPOIs(finalLat, finalLon)
      : Promise.resolve([]),
    city ? fetchWikipedia(city) : Promise.resolve(null),
  ]);

  return {
    lat: finalLat,
    lon: finalLon,
    displayName,
    neighborhood,
    county,
    pois,
    wikipediaSummary: wikiData?.summary ?? null,
    wikipediaUrl: wikiData?.url ?? null,
  };
}
