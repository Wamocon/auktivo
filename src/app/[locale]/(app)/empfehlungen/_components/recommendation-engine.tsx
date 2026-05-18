"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search,
  MapPin,
  Euro,
  Home,
  Star,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ChevronRight,
  Map,
  X,
  ThumbsUp,
  ThumbsDown,
  BrainCircuit,
  ExternalLink,
  Building2,
  Info,
  FileText,
} from "lucide-react";
import type { RecommendationPreferences, RecommendationResult } from "@/app/api/ai/recommendations/route";
import type { Property } from "@/lib/types/database";
import { BUNDESLAENDER } from "@/lib/utils/bundeslaender";

const PROPERTY_TYPE_OPTIONS = [
  { value: "house", label: "Haus" },
  { value: "apartment", label: "Wohnung" },
  { value: "commercial", label: "Gewerbe" },
  { value: "land", label: "Grundstuck" },
  { value: "other", label: "Sonstiges" },
];

const RISK_OPTIONS = [
  { value: "low", label: "Niedrig - nur sichere Objekte" },
  { value: "medium", label: "Mittel - kalkulierbares Risiko" },
  { value: "high", label: "Hoch - auch komplexe Falle" },
];

function formatCurrency(n: number | null | undefined): string {
  if (!n) return "-";
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function formatDate(s: string | null | undefined): string {
  if (!s) return "Termin unbekannt";
  return new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatPropertyType(t: string | null | undefined): string {
  switch (t) {
    case "house": return "Haus";
    case "apartment": return "Wohnung";
    case "commercial": return "Gewerbeimmobilie";
    case "land": return "Grundstuck";
    default: return "Objekt";
  }
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
    score >= 6 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>
      <Star className="h-3 w-3" /> {score.toFixed(1)} / 10
    </span>
  );
}

// ----------------------------------------------------------------
// Popup-Modal: Empfehlungsdetails in Reitern
// ----------------------------------------------------------------

type ModalTab = "uebersicht" | "beschreibung" | "begruendung";

function PropertyDetailModal({
  rec,
  locale,
  onClose,
}: {
  rec: RecommendationResult;
  locale: string;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ModalTab>("uebersicht");
  const p = rec.property as Property;

  const zvgParts = (p.zvg_id ?? "").split(/[-_]/);
  const zvgLand = (zvgParts[0] ?? p.land_abk ?? "").toLowerCase();
  const zvgNumId = zvgParts[1] ?? "";
  const zvgUrl = zvgNumId && zvgLand
    ? `https://www.zvg-portal.de/index.php?button=showZvg&zvg_id=${zvgNumId}&land_abk=${zvgLand}`
    : null;

  const discount = p.market_value && p.minimum_bid
    ? Math.round(((p.market_value - p.minimum_bid) / p.market_value) * 100)
    : null;

  const tabs: { id: ModalTab; label: string; icon: React.ReactNode }[] = [
    { id: "uebersicht", label: "Ubersicht", icon: <Info className="h-4 w-4" /> },
    { id: "beschreibung", label: "Beschreibung", icon: <FileText className="h-4 w-4" /> },
    { id: "begruendung", label: "KI-Begruendung", icon: <BrainCircuit className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <ScoreBadge score={rec.score} />
              {discount && discount > 0 && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  -{discount}% unter Verkehrswert
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              <Building2 className="mr-1.5 inline h-4 w-4 text-zinc-400" />
              {formatPropertyType(p.property_type)}
              {p.city ? ` in ${p.city}` : p.zip_code ? ` (${p.zip_code})` : ""}
            </h2>
            {p.court && (
              <p className="mt-0.5 text-xs text-zinc-400">{p.court}{p.court_file_number ? ` Â· ${p.court_file_number}` : ""}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab-Leiste */}
        <div className="flex gap-1 border-b border-zinc-200 bg-zinc-50 px-4 pt-2 dark:border-zinc-800 dark:bg-zinc-800/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab-Inhalt */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Ubersicht */}
          {activeTab === "uebersicht" && (
            <div className="space-y-4">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ModalRow label="Versteigerungstermin" value={formatDate(p.auction_date)} />
                <ModalRow label="Objekttyp" value={formatPropertyType(p.property_type)} />
                {p.address && <ModalRow label="Adresse" value={p.address} />}
                {p.zip_code && <ModalRow label="PLZ / Ort" value={`${p.zip_code}${p.city ? ` ${p.city}` : ""}`} />}
                {p.state && <ModalRow label="Bundesland" value={p.state} />}
                <ModalRow label="Mindestgebot" value={formatCurrency(p.minimum_bid)} highlight />
                <ModalRow label="Verkehrswert" value={formatCurrency(p.market_value)} />
                {discount !== null && discount > 0 && (
                  <ModalRow label="Abschlag" value={`${discount}% unter Verkehrswert`} />
                )}
                {p.court && <ModalRow label="Amtsgericht" value={p.court} />}
                {p.court_file_number && <ModalRow label="Aktenzeichen" value={p.court_file_number} mono />}
                {p.zvg_id && <ModalRow label="ZVG-ID" value={p.zvg_id} mono />}
              </dl>
            </div>
          )}

          {/* Beschreibung */}
          {activeTab === "beschreibung" && (
            <div className="space-y-4 text-sm">
              {p.beschreibung ? (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Objektbeschreibung</h4>
                  <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">{p.beschreibung}</p>
                </div>
              ) : (
                <p className="text-zinc-400 italic">Keine Beschreibung vorhanden.</p>
              )}
              {p.art_versteigerung && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Art der Versteigerung</h4>
                  <p className="text-zinc-700 dark:text-zinc-300">{p.art_versteigerung}</p>
                </div>
              )}
              {p.grundbuch && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Grundbuch</h4>
                  <p className="text-zinc-700 dark:text-zinc-300">{p.grundbuch}</p>
                </div>
              )}
              {p.objekt_lage && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Lage</h4>
                  <p className="text-zinc-700 dark:text-zinc-300">{p.objekt_lage}</p>
                </div>
              )}
              {p.versteigerungsort && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Ort der Versteigerung</h4>
                  <p className="text-zinc-700 dark:text-zinc-300">{p.versteigerungsort}</p>
                </div>
              )}
              {p.glaeubigerinfo && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Glaeubiger</h4>
                  <p className="text-zinc-700 dark:text-zinc-300">{p.glaeubigerinfo}</p>
                </div>
              )}
              {!p.beschreibung && !p.art_versteigerung && !p.grundbuch && (
                <p className="text-zinc-400 italic">
                  Keine weiteren Beschreibungsdaten verfuegbar. Details im ZVG-Portal abrufen.
                </p>
              )}
            </div>
          )}

          {/* KI-Begruendung */}
          {activeTab === "begruendung" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">KI-Begruendung</p>
                {rec.reasoning}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rec.pros.length > 0 && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/10">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
                      <ThumbsUp className="h-3.5 w-3.5" /> Vorteile
                    </p>
                    <ul className="space-y-1.5">
                      {rec.pros.map((pro, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {rec.cons.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <ThumbsDown className="h-3.5 w-3.5" /> Hinweise
                    </p>
                    <ul className="space-y-1.5">
                      {rec.cons.map((con, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <p className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-400 dark:bg-zinc-800">
                KI-Empfehlungen sind Orientierungshilfen - keine Anlageberatung. WAMOCON GmbH ubernimmt keine Haftung.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/50">
          <div className="flex gap-2">
            <a
              href={`/${locale}/objekte/${p.id}`}
              className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <ExternalLink className="h-4 w-4" /> Detailansicht
            </a>
            {zvgUrl && (
              <a
                href={zvgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                ZVG-Portal <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalRow({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-400">{label}</dt>
      <dd className={`mt-0.5 text-sm ${mono ? "font-mono" : ""} ${highlight ? "font-bold text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300"}`}>
        {value}
      </dd>
    </div>
  );
}

// ----------------------------------------------------------------
// Kompakte Empfehlungskarte
// ----------------------------------------------------------------

function PropertyCard({
  rec,
  onDetails,
}: {
  rec: RecommendationResult;
  onDetails: () => void;
}) {
  const p = rec.property as Property;
  const discount = p.market_value && p.minimum_bid
    ? Math.round(((p.market_value - p.minimum_bid) / p.market_value) * 100)
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ScoreBadge score={rec.score} />
            {discount && discount > 0 && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                -{discount}% unter Verkehrswert
              </span>
            )}
          </div>
          <h3 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-50">
            {formatPropertyType(p.property_type)}
            {p.city ? ` in ${p.city}` : p.zip_code ? ` (${p.zip_code})` : ""}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {p.zip_code} {p.city ?? ""}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {formatDate(p.auction_date)}
            </span>
          </div>
          {/* KI-Kurzbegruendung */}
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {rec.reasoning}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-zinc-400">Mindestgebot</p>
          <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(p.minimum_bid)}
          </p>
          {p.market_value && (
            <p className="text-xs text-zinc-400">VW: {formatCurrency(p.market_value)}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
        <button
          onClick={onDetails}
          className="flex items-center gap-1 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
        >
          Details anzeigen <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

interface RecommendationEngineProps {
  locale: string;
}

export function RecommendationEngine({ locale }: RecommendationEngineProps) {
  const [prefs, setPrefs] = useState<RecommendationPreferences>({
    risk_tolerance: "medium",
    property_types: [],
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecommendationResult[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [selectedRec, setSelectedRec] = useState<RecommendationResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    setResults(null);

    try {
      const res = await fetch("/api/ai/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = (await res.json()) as {
        recommendations?: RecommendationResult[];
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        setErrorMsg(data.error ?? `Fehler ${res.status}`);
        return;
      }
      if (data.message) setInfoMsg(data.message);
      setResults(data.recommendations ?? []);
    } catch {
      setErrorMsg("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  function toggleType(val: string) {
    setPrefs((prev) => {
      const types = prev.property_types ?? [];
      return {
        ...prev,
        property_types: types.includes(val)
          ? types.filter((t) => t !== val)
          : [...types, val],
      };
    });
  }

  // Suppress unused import warning for useRouter (used if needed for navigation)
  void useRouter;

  return (
    <>
      {/* Popup-Modal */}
      {selectedRec && (
        <PropertyDetailModal
          rec={selectedRec}
          locale={locale}
          onClose={() => setSelectedRec(null)}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Formular */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="mb-5 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Suchkriterien
            </h2>

            {/* Budget */}
            <div className="mb-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <Euro className="h-3.5 w-3.5" /> Budget
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min EUR"
                  value={prefs.budget_min ?? ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, budget_min: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-700"
                />
                <input
                  type="number"
                  placeholder="Max EUR"
                  value={prefs.budget_max ?? ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, budget_max: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-700"
                />
              </div>
            </div>

            {/* Bundesland */}
            <div className="mb-4">
              <label htmlFor="empf-bundesland" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <Map className="h-3.5 w-3.5" /> Bundesland
              </label>
              <select
                id="empf-bundesland"
                value={prefs.bundesland ?? ""}
                onChange={(e) => setPrefs((p) => ({ ...p, bundesland: e.target.value || undefined }))}
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">Alle Bundeslaender</option>
                {BUNDESLAENDER.map((bl) => (
                  <option key={bl.short} value={bl.short}>{bl.name}</option>
                ))}
              </select>
            </div>

            {/* Standort */}
            <div className="mb-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <MapPin className="h-3.5 w-3.5" /> Ort oder PLZ (optional)
              </label>
              <input
                type="text"
                placeholder="z.B. Munchen oder 80331"
                value={prefs.location ?? ""}
                onChange={(e) => setPrefs((p) => ({ ...p, location: e.target.value || undefined }))}
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-700"
              />
            </div>

            {/* Objekttyp */}
            <div className="mb-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <Home className="h-3.5 w-3.5" /> Objekttyp
              </label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPE_OPTIONS.map((opt) => {
                  const selected = (prefs.property_types ?? []).includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleType(opt.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        selected
                          ? "bg-brand-500 text-white"
                          : "border border-zinc-300 text-zinc-600 hover:border-brand-400 dark:border-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mindestgroesse */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Mindestgroesse (mÂ²)
              </label>
              <input
                type="number"
                placeholder="z.B. 80"
                value={prefs.size_min ?? ""}
                onChange={(e) => setPrefs((p) => ({ ...p, size_min: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-700"
              />
            </div>

            {/* Risikobereitschaft */}
            <div className="mb-4">
              <label
                htmlFor="risk-tolerance"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                <TrendingUp className="h-3.5 w-3.5" /> Risikobereitschaft
              </label>
              <select
                id="risk-tolerance"
                value={prefs.risk_tolerance ?? "medium"}
                onChange={(e) => setPrefs((p) => ({ ...p, risk_tolerance: e.target.value as "low" | "medium" | "high" }))}
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
              >
                {RISK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Weitere Kriterien */}
            <div className="mb-6">
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Weitere Kriterien (optional)
              </label>
              <textarea
                rows={3}
                placeholder="z.B. Garten gewunscht, kein Sanierungsstau, barrierefrei..."
                value={prefs.other_criteria ?? ""}
                onChange={(e) => setPrefs((p) => ({ ...p, other_criteria: e.target.value || undefined }))}
                className="w-full resize-none rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-zinc-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> KI analysiert...</>
              ) : (
                <><Search className="h-4 w-4" /> Empfehlungen erstellen</>
              )}
            </button>
          </form>
        </div>

        {/* Ergebnisse */}
        <div className="lg:col-span-2">
          {!results && !loading && !errorMsg && (
            <div className="flex h-full min-h-50 items-center justify-center rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <div>
                <Search className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
                <p className="text-sm text-zinc-500">
                  Gib deine Suchkriterien ein und lass die KI passende Objekte empfehlen.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex min-h-50 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-brand-500" />
                <p className="text-sm text-zinc-500">KI analysiert verfugbare Objekte...</p>
                <p className="mt-1 text-xs text-zinc-400">Das kann bis zu 30 Sekunden dauern</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/30 dark:bg-red-900/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
              </div>
            </div>
          )}

          {infoMsg && !errorMsg && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
              <p className="text-sm text-amber-700 dark:text-amber-400">{infoMsg}</p>
            </div>
          )}

          {results && results.length === 0 && !infoMsg && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500">
                Keine Empfehlungen gefunden. Bitte passe deine Suchkriterien an.
              </p>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                {results.length} Empfehlung{results.length !== 1 ? "en" : ""} - sortiert nach KI-Score
              </p>
              {results.map((rec, i) => (
                <PropertyCard
                  key={i}
                  rec={rec}
                  onDetails={() => setSelectedRec(rec)}
                />
              ))}
              <p className="rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-400 dark:bg-zinc-800">
                KI-Empfehlungen sind Orientierungshilfen und ersetzen keine rechtliche, steuerliche oder bautechnische Fachberatung. WAMOCON GmbH ubernimmt keine Haftung.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
