"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  School,
  HeartPulse,
  Bus,
  ShoppingBag,
  Trees,
  ExternalLink,
  Loader2,
  AlertTriangle,
  BookOpen,
  Navigation,
} from "lucide-react";
import type { GeoEnrichmentData, POI } from "@/lib/utils/geo-enrichment";

interface LocationTabProps {
  propertyId: string;
  address: string | null;
  city: string | null;
  zipCode: string;
  /** Bereits aus der DB bekannte Koordinaten (optional) */
  lat?: number | null;
  lon?: number | null;
}

const CATEGORY_META: Record<
  POI["category"],
  { label: string; icon: React.ReactNode; color: string }
> = {
  school: {
    label: "Bildung",
    icon: <School className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
  },
  health: {
    label: "Gesundheit",
    icon: <HeartPulse className="h-4 w-4" />,
    color: "text-red-600 dark:text-red-400",
  },
  transport: {
    label: "OPNV",
    icon: <Bus className="h-4 w-4" />,
    color: "text-green-600 dark:text-green-400",
  },
  shop: {
    label: "Einkaufen",
    icon: <ShoppingBag className="h-4 w-4" />,
    color: "text-amber-600 dark:text-amber-400",
  },
  leisure: {
    label: "Freizeit",
    icon: <Trees className="h-4 w-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  other: {
    label: "Sonstiges",
    icon: <MapPin className="h-4 w-4" />,
    color: "text-zinc-500",
  },
};

const TYPE_LABELS: Record<string, string> = {
  school: "Schule",
  kindergarten: "Kindergarten",
  university: "Universitat",
  hospital: "Krankenhaus",
  clinic: "Klinik",
  pharmacy: "Apotheke",
  doctors: "Arzt",
  dentist: "Zahnarzt",
  bus_stop: "Bushaltestelle",
  stop_position: "Haltestelle",
  station: "Bahnhof",
  halt: "Haltepunkt",
  tram_stop: "Strassenbahn",
  supermarket: "Supermarkt",
  convenience: "Geschaft",
  bakery: "Backerei",
  grocery: "Lebensmittel",
  park: "Park",
  playground: "Spielplatz",
  sports_centre: "Sportzentrum",
};

function formatDistance(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

export function LocationTab({ propertyId, address, city, zipCode, lat, lon }: LocationTabProps) {
  const [data, setData] = useState<GeoEnrichmentData | null>(null);
  const [loading, setLoading] = useState(true); // start true - fetch begins immediately
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/property-enrichment/${propertyId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Fehler ${r.status}`);
        return r.json() as Promise<GeoEnrichmentData>;
      })
      .then((d) => setData(d))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unbekannter Fehler"))
      .finally(() => setLoading(false));
  }, [propertyId]);

  // POIs nach Kategorie gruppieren
  const poiGroups = data
    ? (["transport", "school", "health", "shop", "leisure", "other"] as POI["category"][])
        .map((cat) => ({
          cat,
          pois: data.pois.filter((p) => p.category === cat).slice(0, 6),
        }))
        .filter((g) => g.pois.length > 0)
    : [];

  // Koordinaten fuer Karte
  const mapLat = data?.lat ?? lat;
  const mapLon = data?.lon ?? lon;
  const hasCoords = mapLat != null && mapLon != null;

  const mapEmbedUrl = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapLon! - 0.012},${mapLat! - 0.008},${mapLon! + 0.012},${mapLat! + 0.008}&layer=mapnik&marker=${mapLat},${mapLon}`
    : null;

  const mapLink = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${mapLat}&mlon=${mapLon}&zoom=16`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${address ?? ""} ${zipCode} ${city ?? ""}`)}`;

  return (
    <div className="space-y-5">
      {/* Karte */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <Navigation className="h-4 w-4 text-brand-500" /> Karte
          </h3>
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <ExternalLink className="h-3 w-3" /> Vollbild
          </a>
        </div>
        {mapEmbedUrl ? (
          <iframe
            src={mapEmbedUrl}
            className="h-64 w-full border-0"
            title="Standortkarte"
            loading="lazy"
            allowFullScreen
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-zinc-100 dark:bg-zinc-800">
            <p className="text-sm text-zinc-400">Koordinaten werden ermittelt...</p>
          </div>
        )}
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/30">
          Kartendaten &copy;{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
            OpenStreetMap
          </a>{" "}
          Mitwirkende
        </div>
      </div>

      {/* Lage-Info */}
      {data && (data.neighborhood || data.county || data.displayName) && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Lageangaben (OpenStreetMap)</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
            {data.neighborhood && (
              <div>
                <span className="text-xs text-zinc-400">Stadtteil</span>
                <p className="font-medium text-zinc-800 dark:text-zinc-200">{data.neighborhood}</p>
              </div>
            )}
            {data.county && (
              <div>
                <span className="text-xs text-zinc-400">Landkreis</span>
                <p className="font-medium text-zinc-800 dark:text-zinc-200">{data.county}</p>
              </div>
            )}
            {data.lat && data.lon && (
              <div>
                <span className="text-xs text-zinc-400">Koordinaten</span>
                <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {data.lat.toFixed(5)}, {data.lon.toFixed(5)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lade-Zustand */}
      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-10 dark:border-zinc-800">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          <span className="text-sm text-zinc-500">Umgebungsdaten werden geladen...</span>
        </div>
      )}

      {/* Fehler */}
      {error && !loading && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Umgebungsdaten konnten nicht geladen werden. Bitte direkt die verlinkten Quellen aufrufen.
        </div>
      )}

      {/* POIs */}
      {!loading && poiGroups.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <MapPin className="h-4 w-4 text-brand-500" />
            Umgebung im 700-m-Radius
            <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
              Quelle: OpenStreetMap
            </span>
          </h3>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {poiGroups.map(({ cat, pois: items }) => {
              const meta = CATEGORY_META[cat];
              return (
                <div key={cat}>
                  <div className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${meta.color}`}>
                    {meta.icon} {meta.label}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {items.map((poi) => (
                      <a
                        key={poi.id}
                        href={`https://www.openstreetmap.org/node/${poi.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        <span className="truncate text-zinc-700 dark:text-zinc-300">
                          {poi.name}
                          <span className="ml-1 text-xs text-zinc-400">
                            ({TYPE_LABELS[poi.type] ?? poi.type})
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-mono text-zinc-400">
                          {formatDistance(poi.distanceM)}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {data && data.pois.length === 0 && (
            <p className="text-sm text-zinc-500">
              Keine POIs im 700-m-Radius gefunden (landliche Lage oder Datenlucke in OpenStreetMap).
            </p>
          )}
        </div>
      )}

      {/* Wikipedia-Zusammenfassung */}
      {data?.wikipediaSummary && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              <BookOpen className="h-4 w-4 text-brand-500" />
              {city ?? "Ort"} - Wikipedia
            </h3>
            {data.wikipediaUrl && (
              <a
                href={data.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                <ExternalLink className="h-3 w-3" /> Artikel offnen
              </a>
            )}
          </div>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-6">
            {data.wikipediaSummary}
          </p>
        </div>
      )}

      {/* Externe Links-Block */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Weitere kostenlose Quellen</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            {
              label: "Bodenrichtwert (Boris)",
              url: "https://www.boris-online.de/",
              desc: "Amtliche Grundstuckswerte",
            },
            {
              label: "Wikidata - Gemeinde",
              url: `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(city ?? zipCode)}`,
              desc: "Strukturierte Gemeindedaten",
            },
            {
              label: "GovData - Offene Daten",
              url: `https://www.govdata.de/suche/-/results/q/${encodeURIComponent(city ?? zipCode)}`,
              desc: "Behordendaten zur Region",
            },
            {
              label: "ImmoScout24 - Preisvergleich",
              url: `https://www.immobilienscout24.de/Suche/de/kaufen/haus?realestatetype=housebuying&geocodes=${zipCode}`,
              desc: "Marktpreise in der PLZ",
            },
            {
              label: "Immowelt - Marktpreise",
              url: `https://www.immowelt.de/suche/${zipCode}/haeuser/kaufen`,
              desc: "Weitere Vergleichspreise",
            },
            {
              label: "Destatis - Immobilienpreisindex",
              url: "https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Baupreise-Immobilienpreisindex/_inhalt.html",
              desc: "Offizieller Preisindex",
            },
          ].map(({ label, url, desc }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2.5 rounded-xl border border-zinc-100 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
            >
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
              <div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{label}</p>
                <p className="text-[11px] text-zinc-400">{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
