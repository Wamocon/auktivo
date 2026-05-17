"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Info,
  FileText,
  BrainCircuit,
  MapPin,
  ExternalLink,
  AlertTriangle,
  Loader2,
  PlayCircle,
  RefreshCw,
  BookOpen,
  CloudDownload,
  CheckCircle2,
} from "lucide-react";
import type { Property, PropertyAnalysis, PropertyDocument } from "@/lib/types/database";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";
import { RiskBadge } from "@/components/ui/risk-badge";
import { PdfViewerModal } from "@/components/ui/pdf-viewer-modal";
import { LocationTab } from "./location-tab";

type Tab = "overview" | "description" | "location" | "documents" | "analysis" | "sources";

interface PropertyTabsProps {
  property: Property;
  analysis: PropertyAnalysis | null;
  documents: PropertyDocument[];
  isPro: boolean;
  locale: string;
}

const BUNDESLAENDER: Record<string, string> = {
  bw: "Baden-Wurttemberg",
  by: "Bayern",
  be: "Berlin",
  bb: "Brandenburg",
  hb: "Bremen",
  hh: "Hamburg",
  he: "Hessen",
  mv: "Mecklenburg-Vorpommern",
  ni: "Niedersachsen",
  nw: "Nordrhein-Westfalen",
  rp: "Rheinland-Pfalz",
  sl: "Saarland",
  sn: "Sachsen",
  st: "Sachsen-Anhalt",
  sh: "Schleswig-Holstein",
  th: "Thuringen",
};

export function PropertyTabs({ property: p, analysis: a, documents, isPro, locale }: PropertyTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ url: string; fileName: string } | null>(null);
  const [fetchingDocs, setFetchingDocs] = useState(false);
  const [fetchDocResult, setFetchDocResult] = useState<{ count: number; total: number; errors?: string[] } | null>(null);

  // ZVG-Portal-URL fuer direkten Zugriff - unterstuetzt beide Formate: "RP-3627" und "RP_3627"
  const zvgParts = (p.zvg_id ?? "").split(/[-_]/);
  const zvgLand = (zvgParts.length >= 2 ? zvgParts[0] : (p.land_abk ?? "")).toLowerCase();
  const zvgNumId = zvgParts.length >= 2 ? (zvgParts[1] ?? "") : "";
  const zvgPortalUrl = zvgNumId && zvgLand
    ? `https://www.zvg-portal.de/index.php?button=showZvg&zvg_id=${zvgNumId}&land_abk=${zvgLand}`
    : "https://www.zvg-portal.de";

  // Supabase Storage - oeffentliche URL fuer gespeicherte Dokumente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  function getStorageDocUrl(storagePath: string) {
    return `${supabaseUrl}/storage/v1/object/public/property-docs/${storagePath}`;
  }

  async function fetchDocuments() {
    setFetchingDocs(true);
    setFetchDocResult(null);
    try {
      const res = await fetch(`/api/properties/${p.id}/fetch-documents`, { method: "POST" });
      // Bei Server-Fehler (500) kommt HTML statt JSON - sicher parsen
      let data: { count?: number; total?: number; failed?: number; errors?: string[]; error?: string; message?: string } = {};
      try {
        data = await res.json() as typeof data;
      } catch {
        data = { error: `Server-Fehler (HTTP ${res.status})` };
      }
      if (!res.ok) {
        setFetchDocResult({ count: 0, total: 0, errors: [data.error ?? `HTTP ${res.status}`] });
      } else {
        setFetchDocResult({ count: data.count ?? 0, total: data.total ?? 0, errors: data.errors });
        if ((data.count ?? 0) > 0) {
          router.refresh();
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchDocResult({ count: 0, total: 0, errors: [msg] });
    } finally {
      setFetchingDocs(false);
    }
  }

  async function triggerAnalysis() {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await fetch(`/api/ai/analyze/${p.id}`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setTriggerMsg(data.error ?? `Fehler ${res.status}`);
      } else {
        setTriggerMsg("Analyse wurde gestartet. Seite bitte nach ca. 2 Minuten neu laden.");
      }
    } catch {
      setTriggerMsg("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setTriggering(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Ubersicht", icon: <Info className="h-4 w-4" /> },
    { id: "description", label: "Beschreibung", icon: <MapPin className="h-4 w-4" /> },
    { id: "location", label: "Umgebung", icon: <MapPin className="h-4 w-4" /> },
    {
      id: "documents",
      label: "Dokumente",
      icon: <FileText className="h-4 w-4" />,
      badge: documents.length || p.document_urls.length,
    },
    { id: "analysis", label: "KI-Analyse", icon: <BrainCircuit className="h-4 w-4" /> },
    { id: "sources", label: "Quellen & Links", icon: <ExternalLink className="h-4 w-4" /> },
  ];

  const minBid = p.minimum_bid ?? (p.market_value ? Math.round(p.market_value * 0.5) : null);
  const discount =
    p.market_value && minBid
      ? Math.round(((p.market_value - minBid) / p.market_value) * 100)
      : null;

  return (
    <div>
      {/* PDF Viewer Modal */}
      {pdfViewer && (
        <PdfViewerModal
          url={pdfViewer.url}
          fileName={pdfViewer.fileName}
          onClose={() => setPdfViewer(null)}
        />
      )}

      {/* Tab-Leiste */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge ? (
              <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab: Ubersicht */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Kerndaten */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">Objektdaten</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <DataRow label="Objektart" value={formatType(p.property_type)} />
              {p.art_versteigerung && <DataRow label="Art der Versteigerung" value={p.art_versteigerung} />}
              <DataRow label="Amtsgericht" value={p.court} />
              {p.court_file_number && <DataRow label="Aktenzeichen" value={p.court_file_number} mono />}
              {p.zvg_id && <DataRow label="ZVG-ID" value={p.zvg_id} mono />}
              {p.grundbuch && <DataRow label="Grundbuch" value={p.grundbuch} />}
              {p.state && <DataRow label="Bundesland" value={p.state} />}
              {p.land_abk && BUNDESLAENDER[p.land_abk] && (
                <DataRow label="Bundesland (Abk.)" value={p.land_abk.toUpperCase()} mono />
              )}
              {p.zip_code && <DataRow label="PLZ" value={p.zip_code} mono />}
              {p.city && <DataRow label="Ort" value={p.city} />}
              {p.address && <DataRow label="Adresse" value={p.address} />}
              {p.versteigerungsort && <DataRow label="Ort der Versteigerung" value={p.versteigerungsort} />}
              {p.glaeubigerinfo && <DataRow label="Informationen zum Glaeubiger" value={p.glaeubigerinfo} />}
              {p.auction_date ? (
                <DataRow
                  label="Versteigerungstermin"
                  value={new Date(p.auction_date).toLocaleDateString("de-DE", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              ) : (
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium text-zinc-400">Versteigerungstermin</dt>
                  <dd className="text-sm text-zinc-500 dark:text-zinc-400">Noch nicht bekannt gegeben</dd>
                  <dd>
                    <a
                      href={zvgPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      <ExternalLink className="h-3 w-3" /> Termin auf ZVG-Portal pruefen
                    </a>
                  </dd>
                </div>
              )}
              <DataRow label="Status" value={formatStatus(p.status)} />
              {p.last_crawled_at && (
                <DataRow
                  label="Zuletzt aktualisiert"
                  value={new Date(p.last_crawled_at).toLocaleDateString("de-DE")}
                />
              )}
            </dl>
            {/* GeoServer-Link */}
            {p.geoserver_url && (
              <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <a
                  href={p.geoserver_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <MapPin className="h-4 w-4" /> Karten & Luftbilder (GeoServer)
                </a>
              </div>
            )}
          </div>

          {/* Wertangaben */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">Wertangaben</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ValueCard
                label="Verkehrswert"
                value={p.market_value ? `${p.market_value.toLocaleString("de-DE")} EUR` : "Nicht angegeben"}
                sub={p.market_value ? "Amtlich ermittelt" : undefined}
              />
              <ValueCard
                label="Mindestgebot (ca.)"
                value={minBid ? `${minBid.toLocaleString("de-DE")} EUR` : "k. A."}
                sub={discount ? `-${discount}% unter Verkehrswert` : undefined}
                highlight
              />
              {!p.market_value && (
                <div className="col-span-full flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Kein Verkehrswert erfasst. Bitte ZVG-Portal fur vollstandige Informationen aufrufen.
                </div>
              )}
            </div>
          </div>

          {/* Koordinaten (wenn vorhanden) */}
          {p.lat && p.lng && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Lage</h3>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}&zoom=16`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                >
                  <MapPin className="h-3.5 w-3.5" /> OpenStreetMap
                </a>
                <a
                  href={`https://maps.google.com/?q=${p.lat},${p.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Google Maps
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Beschreibung */}
      {activeTab === "description" && (
        <div className="space-y-4">
          {/* Ausfuehrliche Beschreibung (Detail-Seite) */}
          {p.beschreibung && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Beschreibung (ZVG-Portal)
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {p.beschreibung}
              </p>
            </div>
          )}
          {p.objekt_lage ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Objekt/Lage (ZVG-Portal)
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {p.objekt_lage}
              </p>
            </div>
          ) : (
            !p.beschreibung && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500">
                  Keine erweiterte Beschreibung verfugbar. Die vollstandigen Angaben finden Sie auf dem ZVG-Portal.
                </p>
              </div>
            )
          )}

          {/* Adressblock */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Adresse</h3>
            <address className="not-italic text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {p.address && <span className="block font-medium">{p.address}</span>}
              <span className="block">{p.zip_code} {p.city}</span>
              {p.state && <span className="block text-zinc-500">{p.state}</span>}
            </address>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${p.address ?? ""} ${p.zip_code} ${p.city ?? ""}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              >
                <MapPin className="h-3 w-3" /> Auf Karte zeigen
              </a>
              <a
                href={`https://maps.google.com/maps?q=${encodeURIComponent(`${p.address ?? ""} ${p.zip_code} ${p.city ?? ""}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              >
                <ExternalLink className="h-3 w-3" /> Google Maps
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Umgebung */}
      {activeTab === "location" && (
        <LocationTab
          propertyId={p.id}
          address={p.address}
          city={p.city}
          zipCode={p.zip_code}
          lat={p.lat}
          lon={p.lng}
        />
      )}

      {/* Tab: Dokumente */}
      {activeTab === "documents" && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Verfahrensdokumente
          </h3>
          {documents.length > 0 ? (
            <div className="flex flex-col gap-3">
              {documents.map((doc, i) => {
                // Gespeichertes Dokument: direkte Storage-URL verwenden (kein ZVG-Session-Problem)
                const viewUrl = doc.storage_path
                  ? getStorageDocUrl(doc.storage_path)
                  : doc.original_url;
                const docName = formatDocType(doc.document_type) + (documents.length > 1 ? ` ${i + 1}` : "");
                return (
                  <div key={doc.id} className="flex items-start gap-3 rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50">{docName}</span>
                        {doc.page_count && (
                          <span className="text-xs text-zinc-400">{doc.page_count} Seiten</span>
                        )}
                        {doc.file_size_bytes && (
                          <span className="text-xs text-zinc-400">{formatBytes(doc.file_size_bytes)}</span>
                        )}
                        {doc.ocr_status === "done" && (
                          <span className="flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> Chatbot-bereit
                          </span>
                        )}
                        {doc.storage_path && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Gespeichert
                          </span>
                        )}
                      </div>
                      {doc.ocr_text && (
                        <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed dark:text-zinc-400">
                          {doc.ocr_text.slice(0, 400)}{doc.ocr_text.length > 400 ? "..." : ""}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => setPdfViewer({ url: viewUrl, fileName: docName })}
                          className="flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400"
                        >
                          <BookOpen className="h-3 w-3" /> In App lesen
                        </button>
                        {!doc.storage_path && (
                          <a
                            href={doc.original_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            <ExternalLink className="h-3 w-3" /> ZVG-Portal
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : p.document_urls.length > 0 ? (
            <div className="flex flex-col gap-2">
              {p.document_urls.map((url, i) => {
                // Dateiname aus URL extrahieren
                const raw = url.split("?")[0] ?? url;
                const rawName = decodeURIComponent(raw.split("/").pop() ?? "");
                // Fallback-Namen fuer dynamische ZVG-URLs (index.php?button=showDoc...)
                const fileName = rawName && rawName !== "index.php" ? rawName : `Dokument ${i + 1}`;
                const isPdf =
                  url.toLowerCase().includes(".pdf") ||
                  url.toLowerCase().includes("showdoc") ||
                  url.toLowerCase().includes("download") ||
                  fileName.toLowerCase().includes(".pdf");
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-800"
                  >
                    <FileText className={`h-4 w-4 shrink-0 ${isPdf ? "text-red-500" : "text-zinc-400"}`} />
                    <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">{fileName}</span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => setPdfViewer({ url, fileName })}
                        className="flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400"
                      >
                        <BookOpen className="h-3 w-3" /> Lesen
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        <ExternalLink className="h-3 w-3" /> ZVG-Portal
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <FileText className="h-6 w-6 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Noch keine Dokumente verfugbar</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
                  Klicke auf &ldquo;Dokumente laden&rdquo; um Gutachten und Beschlusse vom ZVG-Portal
                  direkt in die App zu laden. Danach kannst du sie lesen und mit dem Chatbot besprechen.
                </p>
              </div>

              {/* Ergebnis-Meldung */}
              {fetchDocResult && (
                <div className={`w-full max-w-sm rounded-xl p-4 text-sm ${
                  fetchDocResult.count > 0
                    ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                    : "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                }`}>
                  {fetchDocResult.count > 0 ? (
                    <p className="font-medium">
                      {fetchDocResult.count} von {fetchDocResult.total} Dokument(e) erfolgreich gespeichert.
                      {fetchDocResult.count > 0 && " Seite wird aktualisiert..."}
                    </p>
                  ) : fetchDocResult.total === 0 ? (
                    <p>Auf dem ZVG-Portal wurden keine Dokumente gefunden.</p>
                  ) : (
                    <p>Dokumente konnten nicht geladen werden.</p>
                  )}
                  {fetchDocResult.errors && fetchDocResult.errors.length > 0 && (
                    <ul className="mt-2 text-xs opacity-70">
                      {fetchDocResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={fetchDocuments}
                  disabled={fetchingDocs}
                  className="flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
                >
                  {fetchingDocs ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Dokumente werden geladen...</>
                  ) : (
                    <><CloudDownload className="h-4 w-4" /> Dokumente laden</>
                  )}
                </button>
                <a
                  href={zvgPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <ExternalLink className="h-4 w-4" /> ZVG-Portal
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: KI-Analyse */}
      {activeTab === "analysis" && (
        <div className="space-y-4">
          {!isPro ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <BrainCircuit className="h-12 w-12 text-zinc-300" />
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  KI-Risikoanalyse ist ein Pro-Feature
                </p>
                <p className="max-w-sm text-sm text-zinc-500">
                  Mit Auktivo Pro analysiert unsere KI Gutachten, Belastungen und Risiken automatisch.
                </p>
                <a
                  href={`/${locale}/upgrade`}
                  className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Upgrade auf Pro
                </a>
              </div>
            </div>
          ) : !a ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <BrainCircuit className="h-12 w-12 text-zinc-300" />
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Noch keine KI-Analyse vorhanden
                </p>
                <p className="max-w-sm text-sm text-zinc-500">
                  Starte die Analyse manuell. Die KI wertet verfugbare Dokumente und Objektdaten aus.
                </p>
                {triggerMsg ? (
                  <p className="max-w-sm rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {triggerMsg}
                  </p>
                ) : (
                  <button
                    onClick={triggerAnalysis}
                    disabled={triggering}
                    className="flex items-center gap-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    {triggering ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Wird analysiert...</>
                    ) : (
                      <><PlayCircle className="h-4 w-4" /> Analyse starten</>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : a.analysis_status === "failed" ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Analyse fehlgeschlagen</p>
              </div>
              <p className="mb-4 text-sm text-zinc-500">{a.error_message}</p>
              {triggerMsg ? (
                <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {triggerMsg}
                </p>
              ) : (
                <button
                  onClick={triggerAnalysis}
                  disabled={triggering}
                  className="flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {triggering ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Bitte warten...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4" /> Erneut analysieren</>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {a.analysis_model === "algorithmic-fallback" ? "Algorithmische Auswertung" : "KI-Risikoanalyse"}
                </h3>
                {a.risk_level && <RiskBadge level={a.risk_level} />}
              </div>

              {/* Fallback-Banner wenn KI nicht erreichbar war */}
              {a.analysis_model === "algorithmic-fallback" && (
                <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        KI nicht erreichbar - Algorithmische Auswertung
                      </p>
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        Der KI-Dienst war zum Analysezeitpunkt nicht verfuegbar. Diese Auswertung basiert auf
                        einer Schlagwortsuche im OCR-Text und ist weniger praezise als eine vollstaendige KI-Analyse.
                        Bitte starten Sie die Analyse erneut, sobald der Dienst verfuegbar ist.
                      </p>
                    </div>
                  </div>
                  {triggerMsg ? (
                    <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      {triggerMsg}
                    </p>
                  ) : (
                    <button
                      onClick={triggerAnalysis}
                      disabled={triggering}
                      className="flex w-fit items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                    >
                      {triggering ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> KI-Analyse wird gestartet...</>
                      ) : (
                        <><RefreshCw className="h-3.5 w-3.5" /> KI-Analyse jetzt starten</>
                      )}
                    </button>
                  )}
                </div>
              )}

              {a.summary && (
                <div className="mb-5 rounded-xl bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {a.summary}
                </div>
              )}

              {(["baulasten", "sanierungsbedarf", "mietverhaeltnisse", "grundbuchbelastungen"] as const).map((cat) => {
                const signals = a.risk_signals[cat] ?? [];
                if (signals.length === 0) return null;
                return (
                  <div key={cat} className="mb-4">
                    <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      {formatRiskCategory(cat)}
                    </h4>
                    <div className="flex flex-col gap-2">
                      {signals.map((signal, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                        >
                          <span
                            className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                              signal.severity === "high"
                                ? "bg-red-500"
                                : signal.severity === "medium"
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                            }`}
                          />
                          <div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">{signal.description}</p>
                            {signal.text_excerpt && (
                              <p className="mt-1 text-xs italic text-zinc-400">&ldquo;{signal.text_excerpt}&rdquo;</p>
                            )}
                            {signal.cost_estimate_eur && (
                              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                                Kostensch.: {signal.cost_estimate_eur} EUR
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {(a.risk_signals.positive_signals ?? []).length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Positive Aspekte</h4>
                  <div className="flex flex-col gap-1.5">
                    {a.risk_signals.positive_signals.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {s.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {a.analyzed_at && (
                <p className="mt-2 text-xs text-zinc-400">
                  Analysiert am {new Date(a.analyzed_at).toLocaleDateString("de-DE")} &middot; Modell: {a.analysis_model ?? "unbekannt"}
                </p>
              )}

              <AiDisclaimer variant="full" className="mt-4" />
            </div>
          )}
        </div>
      )}

      {/* Tab: Quellen & Links */}
      {activeTab === "sources" && (
        <div className="space-y-4">
          {(() => {
            // ZVG-ID aufsplitten: "HE-54578" → land="he", numId="54578"
            const zvgParts = p.zvg_id?.split("-") ?? [];
            const zvgLandRaw = zvgParts[0] ?? p.land_abk ?? "";
            const zvgLand = zvgLandRaw.toLowerCase();
            const zvgNumId = zvgParts[1] ?? "";
            const zvgDirectUrl = zvgNumId && zvgLand
              ? `https://www.zvg-portal.de/index.php?button=showZvg&zvg_id=${zvgNumId}&land_abk=${zvgLand}`
              : null;

            return (
              <>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">Offizielle Quellen</h3>
            <div className="flex flex-col gap-3">
              {zvgDirectUrl && (
                <SourceLink
                  title="Direkt zum Objekt im ZVG-Portal"
                  url={zvgDirectUrl}
                  description={`Amtliche Objektseite - AZ ${p.court_file_number ?? p.zvg_id}`}
                />
              )}
              {p.land_abk && (
                <SourceLink
                  title={`ZVG-Portal ${BUNDESLAENDER[p.land_abk] ?? p.land_abk.toUpperCase()} - Alle Objekte`}
                  url={`https://www.zvg-portal.de/index.php?button=Suchen&all=1&land_abk=${p.land_abk}`}
                  description={`Alle aktuellen Zwangsversteigerungen in ${BUNDESLAENDER[p.land_abk] ?? p.land_abk.toUpperCase()}`}
                />
              )}
              {p.court && p.land_abk && (
                <SourceLink
                  title={`${p.court} - Versteigerungen`}
                  url={`https://www.zvg-portal.de/index.php?button=Suchen&all=1&land_abk=${p.land_abk}&ger_name=${encodeURIComponent(p.court)}`}
                  description={`Alle Objekte dieses Amtsgerichts im ZVG-Portal`}
                />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">Freie Geodaten & Marktdaten</h3>
            <div className="flex flex-col gap-3">
              <SourceLink
                title="OpenStreetMap - Standort"
                url={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${p.address ?? ""} ${p.zip_code} ${p.city ?? ""}`)}`}
                description="Kostenloses Kartenmaterial, Infrastruktur und Umgebungsdaten"
              />
              <SourceLink
                title="Google Maps - Umgebung"
                url={`https://maps.google.com/maps?q=${encodeURIComponent(`${p.address ?? ""} ${p.zip_code} ${p.city ?? ""}`)}`}
                description="Street View, POIs und Routenplanung"
              />
              <SourceLink
                title="Boris-Online (Bodenrichtwert)"
                url="https://www.boris-online.de/"
                description="Offizielle Bodenrichtwerte der Gutachterausschusse (kostenfrei)"
              />
              <SourceLink
                title="Statistisches Amt - Immobilienpreisindex"
                url="https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Baupreise-Immobilienpreisindex/_inhalt.html"
                description="Offizielle Preisindizes des Statistischen Bundesamts"
              />
              <SourceLink
                title="GovData - Offene Verwaltungsdaten"
                url={`https://www.govdata.de/suche/-/results/q/${encodeURIComponent(p.city ?? p.zip_code)}`}
                description="Offene Daten aus Behorden und offentlichen Stellen"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">Marktvergleich</h3>
            <div className="flex flex-col gap-3">
              <SourceLink
                title="ImmoScout24 - Vergleichspreise"
                url={`https://www.immobilienscout24.de/Suche/de/kaufen/haus?realestatetype=housebuying&geocodes=${p.zip_code}`}
                description="Aktuelle Kaufpreise fur vergleichbare Objekte"
              />
              <SourceLink
                title="Immowelt - Marktpreise"
                url={`https://www.immowelt.de/suche/${p.zip_code ? p.zip_code : (p.city ?? "").toLowerCase()}/haeuser/kaufen`}
                description="Weitere Marktpreise und Angebote in der Region"
              />
            </div>
          </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// Hilfsfunktionen

function DataRow({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-zinc-400">{label}</dt>
      <dd className={`text-sm text-zinc-800 dark:text-zinc-200 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function ValueCard({ label, value, sub, highlight = false }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-brand-50 dark:bg-brand-900/20" : "bg-zinc-50 dark:bg-zinc-800"}`}>
      <p className={`mb-1 text-xs font-medium ${highlight ? "text-brand-600 dark:text-brand-400" : "text-zinc-500"}`}>{label}</p>
      <p className={`text-lg font-black ${highlight ? "text-brand-700 dark:text-brand-300" : "text-zinc-900 dark:text-zinc-50"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{sub}</p>}
    </div>
  );
}

function SourceLink({ title, url, description }: { title: string; url: string; description: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
    >
      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
    </a>
  );
}

function formatType(type: string | null | undefined): string {
  const types: Record<string, string> = {
    house: "Haus / Einfamilienhaus",
    apartment: "Eigentumswohnung",
    commercial: "Gewerbeimmobilie",
    land: "Grundstuck",
    other: "Sonstiges",
  };
  return types[type ?? "other"] ?? "Sonstiges";
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    active: "Aktiv",
    withdrawn: "Zuruckgezogen",
    sold: "Versteigert",
  };
  return map[status] ?? status;
}

function formatDocType(type: string | null | undefined): string {
  const map: Record<string, string> = {
    gutachten: "Gutachten",
    beschluss: "Beschluss",
    sonstig: "Sonstiges Dokument",
  };
  return map[type ?? "sonstig"] ?? "Dokument";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRiskCategory(cat: string): string {
  const map: Record<string, string> = {
    baulasten: "Baulasten & Einschrankungen",
    sanierungsbedarf: "Sanierungsbedarf",
    mietverhaeltnisse: "Mietverhaltnisse",
    grundbuchbelastungen: "Grundbuchbelastungen",
    positive_signals: "Positive Aspekte",
  };
  return map[cat] ?? cat;
}
