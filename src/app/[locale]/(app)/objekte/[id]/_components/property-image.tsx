/**
 * Eigenschafts-Vorschaubild: zeigt entweder
 * 1. Google Street View (wenn GOOGLE_MAPS_STATIC_API_KEY gesetzt)
 * 2. OpenStreetMap statische Karte (kostenlos, kein API-Key)
 * 3. Gestylten Platzhalter wenn keine Koordinaten vorhanden
 *
 * Server Component - kein Client-JS noetig.
 */
import type { Property } from "@/lib/types/database";

interface Props {
  property: Property;
  /** Bereits extrahierte Bilder aus PDF-Dokumenten (Storage-URLs) */
  docImages?: string[];
}

type ImageConfig =
  | { type: "streetview"; src: string }
  | { type: "osm"; src: string }
  | { type: "docimage"; src: string }
  | { type: "placeholder" };

function buildImageConfig(p: Property, docImages: string[]): ImageConfig {
  // Prioritaet 1: Bilder aus heruntergeladenen Gutachten (echte Fotos)
  if (docImages.length > 0) {
    return { type: "docimage", src: docImages[0] };
  }

  const googleKey = process.env.GOOGLE_MAPS_STATIC_API_KEY;
  const { lat, lng, address, city, zip_code } = p;

  // Prioritaet 2: Google Street View (zeigt das Gebaeude)
  if (googleKey) {
    const location = lat && lng
      ? `${lat},${lng}`
      : encodeURIComponent(`${address ?? ""} ${zip_code} ${city ?? ""}`);
    if (location) {
      return {
        type: "streetview",
        src: `https://maps.googleapis.com/maps/api/streetview?size=800x380&location=${location}&pitch=5&fov=90&key=${googleKey}`,
      };
    }
  }

  // Prioritaet 3: OpenStreetMap statische Karte (kostenlos, kein API-Key)
  if (lat && lng) {
    return {
      type: "osm",
      src: `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=17&size=800x380&markers=${lat},${lng},red-pushpin`,
    };
  }

  return { type: "placeholder" };
}

const PROPERTY_TYPE_ICON: Record<string, string> = {
  house: "🏠",
  apartment: "🏢",
  commercial: "🏪",
  land: "🌿",
  other: "🏛",
};

export function PropertyImage({ property: p, docImages = [] }: Props) {
  const config = buildImageConfig(p, docImages);
  const typeIcon = PROPERTY_TYPE_ICON[p.property_type ?? "other"] ?? "🏛";

  if (config.type === "placeholder") {
    return (
      <div className="mb-0 flex h-40 items-center justify-center rounded-t-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
        <div className="text-center">
          <span className="text-5xl opacity-40">{typeIcon}</span>
          <p className="mt-2 text-xs text-zinc-400">Keine Bildvorschau verfuegbar</p>
        </div>
      </div>
    );
  }

  const isDocImage = config.type === "docimage";
  const isStreetView = config.type === "streetview";

  return (
    <div className="relative mb-0 overflow-hidden rounded-t-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={config.src}
        alt={`Lageansicht ${p.address ?? p.city ?? ""}`}
        className="h-52 w-full object-cover"
        loading="lazy"
      />
      {/* Beschriftungs-Badge */}
      <div className="absolute bottom-2 right-2">
        <span className="rounded-md bg-black/50 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
          {isDocImage ? "Aus Gutachten" : isStreetView ? "Google Street View" : "OpenStreetMap"}
        </span>
      </div>
      {/* Gradient-Fade nach unten fuer weichen Uebergang zur Karte */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white dark:from-zinc-900" />
    </div>
  );
}
