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

function PropertyCard({ rec, locale }: { rec: RecommendationResult; locale: string }) {
  const router = useRouter();
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
            {p.property_type === "house" ? "Haus" :
             p.property_type === "apartment" ? "Wohnung" :
             p.property_type === "commercial" ? "Gewerbe" :
             p.property_type === "land" ? "Grundstuck" : "Objekt"}
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

      {/* KI-Begruendung */}
      <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/30">
        <p className="mb-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {rec.reasoning}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rec.pros.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-green-700 dark:text-green-400">Vorteile</p>
              <ul className="space-y-0.5">
                {rec.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {rec.cons.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-400">Hinweise</p>
              <ul className="space-y-0.5">
                {rec.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
        <button
          onClick={() => router.push(`/${locale}/objekte/${p.id}`)}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          Objekt ansehen <ChevronRight className="h-4 w-4" />
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

  return (
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
              Mindestgroesse (m²)
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
              <PropertyCard key={i} rec={rec} locale={locale} />
            ))}
            <p className="rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-400 dark:bg-zinc-800">
              KI-Empfehlungen sind Orientierungshilfen und ersetzen keine rechtliche, steuerliche oder bautechnische Fachberatung. WAMOCON GmbH ubernimmt keine Haftung.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
