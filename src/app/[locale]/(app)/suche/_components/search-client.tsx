"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Search, Filter, Lock, Loader2, MapPin, Building2, Calendar,
  TrendingUp, Euro, Map, ChevronDown, ChevronRight, X, ArrowUpDown,
  LayoutGrid, Layers, RotateCcw,
} from "lucide-react";
import { RiskBadge } from "@/components/ui/risk-badge";
import { PropertyModal } from "./property-modal";
import { daysUntil } from "@/lib/utils/date";
import { BUNDESLAENDER } from "@/lib/utils/bundeslaender";
import type { Profile, PropertyWithAnalysis, RiskLevel, PropertyType } from "@/lib/types/database";

interface SearchClientProps {
  profile: Profile | null;
  locale: string;
}


function PropertyCard({
  property,
  onSelect,
}: {
  property: PropertyWithAnalysis;
  onSelect: () => void;
}) {
  const t = useTranslations("search");
  const days = daysUntil(property.auction_date ?? null);

  const typeLabel: Record<string, string> = {
    house: t("property_types.house"),
    apartment: t("property_types.apartment"),
    commercial: t("property_types.commercial"),
    land: t("property_types.land"),
    other: t("property_types.other"),
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full flex-col rounded-2xl bg-white text-left shadow-sm shadow-zinc-950/5 ring-1 ring-zinc-950/5 transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-zinc-900 dark:ring-white/5 dark:hover:ring-white/10"
    >
      <div
        className={`h-1 w-full rounded-t-2xl ${
          property.property_analyses?.risk_level === "critical"
            ? "bg-red-500"
            : property.property_analyses?.risk_level === "high"
              ? "bg-orange-400"
              : property.property_analyses?.risk_level === "medium"
                ? "bg-amber-400"
                : property.property_analyses?.risk_level === "low"
                  ? "bg-green-400"
                  : "bg-zinc-200 dark:bg-zinc-700"
        }`}
      />

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            <Building2 className="h-3 w-3" />
            {typeLabel[property.property_type ?? "other"] ?? "Objekt"}
          </span>
          {property.property_analyses?.risk_level && (
            <RiskBadge level={property.property_analyses.risk_level} />
          )}
        </div>

        <h3 className="mb-0.5 font-bold text-zinc-900 transition-colors group-hover:text-brand-600 dark:text-zinc-50 dark:group-hover:text-brand-400">
          {property.address ? property.address : property.city}
        </h3>

        <div className="mb-4 flex items-center gap-1 text-xs text-zinc-400">
          <MapPin className="h-3 w-3 shrink-0" />
          {property.city}, {property.zip_code} &middot; {property.court}
        </div>

        {/* Kurzbeschreibung */}
        {property.objekt_lage && (
          <p className="mb-3 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
            {property.objekt_lage}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-zinc-400">Verkehrswert</p>
            <p className="text-lg font-black text-zinc-900 dark:text-zinc-50">
              {property.market_value
                ? `${property.market_value.toLocaleString("de-DE")} EUR`
                : "k. A."}
            </p>
          </div>
          {days !== null && (
            <div
              className={`rounded-lg px-2.5 py-1.5 text-center ${
                days <= 7
                  ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  : days <= 21
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              <p className="flex items-center gap-1 text-[10px] font-medium">
                <Calendar className="h-2.5 w-2.5" /> Termin in
              </p>
              <p className="text-sm font-black">{days}d</p>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function SearchClient({ profile, locale }: SearchClientProps) {
  const t = useTranslations("search");
  const isPro = profile?.plan === "pro";
  const initialLoadDone = useRef(false);

  // Filter-State
  const [zip, setZip] = useState("");
  const [bundesland, setBundesland] = useState("");
  const [radius, setRadius] = useState<number>(20);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [budgetMin, setBudgetMin] = useState<string>("");
  const [budgetMax, setBudgetMax] = useState<string>("");
  const [locating, setLocating] = useState(false);
  const [terminVon, setTerminVon] = useState("");
  const [terminBis, setTerminBis] = useState("");
  const [sortBy, setSortBy] = useState("auction_date_asc");
  const [court, setCourt] = useState("");

  // UI-State
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PropertyWithAnalysis[]>([]);
  const [searched, setSearched] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithAnalysis | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "grouped">("grouped");
  const [openStates, setOpenStates] = useState<Set<string>>(new Set());

  const executeSearch = useCallback(async (overrides?: {
    zip?: string; bundesland?: string; radius?: number; propertyTypes?: PropertyType[];
    budgetMin?: string; budgetMax?: string; terminVon?: string; terminBis?: string;
    sortBy?: string; court?: string;
  }) => {
    setLoading(true);
    setErrorMsg(null);
    setLimitReached(false);

    const z    = overrides?.zip            ?? zip;
    const bl   = overrides?.bundesland     ?? bundesland;
    const r    = overrides?.radius         ?? radius;
    const pt   = overrides?.propertyTypes  ?? propertyTypes;
    const bMin = overrides?.budgetMin      ?? budgetMin;
    const bMax = overrides?.budgetMax      ?? budgetMax;
    const tv   = overrides?.terminVon      ?? terminVon;
    const tb   = overrides?.terminBis      ?? terminBis;
    const sb   = overrides?.sortBy         ?? sortBy;
    const ct   = overrides?.court          ?? court;

    const params = new URLSearchParams();
    if (z)       params.set("zip", z);
    if (bl)      params.set("bundesland", bl);
    params.set("radius", String(r));
    if (pt.length)  params.set("types", pt.join(","));
    if (bMin)    params.set("budget_min", bMin);
    if (bMax)    params.set("budget_max", bMax);
    if (tv)      params.set("termin_von", tv);
    if (tb)      params.set("termin_bis", tb);
    params.set("sort_by", sb);
    if (ct)      params.set("court", ct);

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json() as {
        properties?: PropertyWithAnalysis[];
        limitReached?: boolean;
        error?: string;
        isOpenSearch?: boolean;
      };

      if (data.limitReached) {
        setLimitReached(true);
      } else if (data.error) {
        setErrorMsg(data.error);
      } else {
        const props = data.properties ?? [];
        setResults(props);
        // Alle Bundeslaender automatisch aufklappen bei <= 100 Ergebnissen
        if (props.length <= 100) {
          setOpenStates(new Set(props.map((p) => p.state ?? "Unbekannt")));
        }
      }
    } catch {
      setErrorMsg("Verbindungsfehler. Bitte erneut versuchen.");
    }

    setSearched(true);
    setLoading(false);
  }, [zip, bundesland, radius, propertyTypes, budgetMin, budgetMax, terminVon, terminBis, sortBy, court]);

  // Beim ersten Rendern: Standort ermitteln und Suche mit 20-km-Umkreis starten.
  // Fallback: alle Objekte ohne Ortsfilter laden wenn Standort nicht verfuegbar.
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;

      if (typeof navigator !== "undefined" && navigator.geolocation) {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                { headers: { "Accept-Language": "de" } }
              );
              const data = await res.json() as { address?: { postcode?: string } };
              const plz = (data?.address?.postcode ?? "").replace(/\D/g, "").slice(0, 5);
              setLocating(false);
              if (plz.length === 5) {
                setZip(plz);
                void executeSearch({ zip: plz, radius: 20 });
              } else {
                void executeSearch({ zip: "", radius: 20 });
              }
            } catch {
              setLocating(false);
              void executeSearch({ zip: "", radius: 20 });
            }
          },
          () => {
            // Standort verweigert oder nicht verfuegbar - offene Suche
            setLocating(false);
            void executeSearch({ zip: "", bundesland: "", propertyTypes: [], budgetMin: "", budgetMax: "", terminVon: "", terminBis: "", court: "" });
          },
          { timeout: 8000, maximumAge: 300_000 }
        );
      } else {
        void executeSearch({ zip: "", bundesland: "", propertyTypes: [], budgetMin: "", budgetMax: "", terminVon: "", terminBis: "", court: "" });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function locateUser() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "de" } }
          );
          const data = await res.json() as { address?: { postcode?: string } };
          const plz = (data?.address?.postcode ?? "").replace(/\D/g, "").slice(0, 5);
          setLocating(false);
          if (plz.length === 5) {
            setZip(plz);
            setRadius(20);
            void executeSearch({ zip: plz, radius: 20 });
          }
        } catch {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await executeSearch();
  }

  function resetFilters() {
    setZip(""); setBundesland(""); setRadius(20); setPropertyTypes([]);
    setBudgetMin(""); setBudgetMax(""); setTerminVon(""); setTerminBis("");
    setCourt(""); setSortBy("auction_date_asc");
    void executeSearch({ zip: "", bundesland: "", propertyTypes: [], budgetMin: "", budgetMax: "", terminVon: "", terminBis: "", court: "", sortBy: "auction_date_asc" });
  }

  const hasActiveFilters = !!(zip || bundesland || propertyTypes.length > 0 || budgetMin || budgetMax || terminVon || terminBis || court);

  // Gruppierung nach Bundesland
  const grouped: Record<string, PropertyWithAnalysis[]> = {};
  for (const p of results) {
    const key = p.state ?? "Unbekannt";
    (grouped[key] ??= []).push(p);
  }
  const groupedStates = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "de"));

  function toggleState(state: string) {
    setOpenStates((prev) => {
      const next = new Set(prev);
      if (next.has(state)) next.delete(state); else next.add(state);
      return next;
    });
  }

  const propertyTypeOptions: { value: PropertyType; label: string }[] = [
    { value: "house",      label: t("property_types.house") },
    { value: "apartment",  label: t("property_types.apartment") },
    { value: "commercial", label: t("property_types.commercial") },
    { value: "land",       label: t("property_types.land") },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* ─── Sidebar ─── */}
      <aside className="lg:col-span-1">
        <form
          onSubmit={handleSearch}
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/5"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
              <Filter className="h-4 w-4 text-brand-500" /> Filter
            </h2>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <RotateCcw className="h-3 w-3" /> {t("clear_filters")}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {/* Bundesland */}
            <div>
              <label htmlFor="bundesland-select" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <Map className="h-3.5 w-3.5" /> {t("bundesland_label")}
              </label>
              <select
                id="bundesland-select"
                value={bundesland}
                onChange={(e) => setBundesland(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                <option value="">{t("all_states")}</option>
                {BUNDESLAENDER.map((bl) => (
                  <option key={bl.short} value={bl.short}>{bl.name}</option>
                ))}
              </select>
            </div>

            {/* PLZ + Standort-Button */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("zip_label")}</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder={t("zip_placeholder")}
                  maxLength={5}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition-all placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <button
                  type="button"
                  title="Meinen Standort verwenden"
                  onClick={locateUser}
                  disabled={locating}
                  className="flex shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-brand-400"
                >
                  {locating ? <Loader2 className="h-4 w-4 animate-spin text-brand-500" /> : <MapPin className="h-4 w-4" />}
                </button>
              </div>
              {locating && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-brand-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Standort wird ermittelt...
                </p>
              )}
            </div>

            {/* Umkreis */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("radius")}</label>
              <div className="grid grid-cols-4 gap-1">
                {[10, 20, 50, 100].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadius(r)}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${radius === r ? "bg-brand-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"}`}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>

            {/* Objekttyp */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("property_type")}</label>
              <div className="flex flex-col gap-2">
                {propertyTypeOptions.map(({ value, label }) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={propertyTypes.includes(value)}
                      onChange={(e) => {
                        if (e.target.checked) setPropertyTypes([...propertyTypes, value]);
                        else setPropertyTypes(propertyTypes.filter((v) => v !== value));
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-brand-500 focus:ring-brand-500 dark:border-zinc-600"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <Euro className="h-3.5 w-3.5" /> {t("budget_label")}
              </label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min EUR" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-all placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
                <input type="number" placeholder="Max EUR" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-all placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
              </div>
            </div>

            {/* Termin (von/bis) */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <Calendar className="h-3.5 w-3.5" /> {t("date_range")}
              </label>
              <div className="flex flex-col gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-zinc-400">{t("termin_von")}
                  <input type="date" value={terminVon} onChange={(e) => setTerminVon(e.target.value)}
                    className="mt-0.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" /></label>
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-zinc-400">{t("termin_bis")}
                  <input type="date" value={terminBis} onChange={(e) => setTerminBis(e.target.value)}
                    className="mt-0.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" /></label>
                </div>
              </div>
            </div>

            {/* Amtsgericht */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <MapPin className="h-3.5 w-3.5" /> {t("court_label")}
              </label>
              <input
                type="text"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                placeholder={t("court_placeholder")}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition-all placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>

            {/* Risikostufe (Pro-Feature) */}
            <div className="relative">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t("risk_level")}
                {!isPro && <Lock className="h-3 w-3 text-zinc-300" />}
              </p>
              <div className={`flex flex-col gap-2 ${!isPro ? "pointer-events-none opacity-30" : ""}`}>
                {(["low", "medium", "high", "critical"] as RiskLevel[]).map((level) => (
                  <label key={level} className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" aria-label={level} disabled={!isPro} className="h-4 w-4 rounded border-zinc-300 text-brand-500" />
                    <RiskBadge level={level} />
                  </label>
                ))}
              </div>
              {!isPro && (
                <Link href="/upgrade" className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100/90 text-xs font-semibold text-brand-600 backdrop-blur-sm dark:bg-zinc-800/90">
                  <TrendingUp className="h-3 w-3" /> {t("pro_unlock")}
                </Link>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-full bg-zinc-900 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-zinc-700 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {t("search_button")}
            </button>
          </div>
        </form>

        {!isPro && (
          <div className="mt-3 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-3.5 dark:border-amber-500/50 dark:bg-amber-900/10">
            <p className="mb-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
              {t("searches_month", { used: profile?.monthly_search_count ?? 0 })}
            </p>
            <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/40">
              <div
                className="h-full rounded-full bg-amber-500"
                ref={(el) => { if (el) el.style.width = `${Math.min(100, ((profile?.monthly_search_count ?? 0) / 5) * 100)}%`; }}
              />
            </div>
            <Link href="/upgrade" className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
              {t("upgrade_pro")} &rarr;
            </Link>
          </div>
        )}
      </aside>

      {/* ─── Ergebnisse ─── */}
      <div className="lg:col-span-3">

        {/* Toolbar: Anzahl + Sortierung + Ansichtswechsel */}
        {searched && !loading && results.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-zinc-500">
              {hasActiveFilters
                ? t("results", { count: results.length })
                : t("all_objects_count", { count: results.length })}
            </p>
            <div className="flex items-center gap-2">
              {/* Sortierung */}
              <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label={t("sort_label")}
                  className="bg-transparent text-xs text-zinc-700 outline-none dark:text-zinc-300"
                >
                  <option value="auction_date_asc">{t("sort_date_asc")}</option>
                  <option value="auction_date_desc">{t("sort_date_desc")}</option>
                  <option value="price_asc">{t("sort_price_asc")}</option>
                  <option value="price_desc">{t("sort_price_desc")}</option>
                  <option value="state">{t("sort_state")}</option>
                </select>
              </div>
              {/* Ansichtswechsel */}
              <div className="flex overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  title={t("grouped_view")}
                  onClick={() => setViewMode("grouped")}
                  className={`px-3 py-1.5 transition-colors ${viewMode === "grouped" ? "bg-zinc-900 text-white dark:bg-brand-500" : "bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"}`}
                >
                  <Layers className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title={t("list_view")}
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 transition-colors ${viewMode === "grid" ? "bg-zinc-900 text-white dark:bg-brand-500" : "bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {limitReached && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4 dark:border-amber-500/50 dark:bg-amber-900/10">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t("limit_reached")}</p>
              <Link href="/upgrade" className="mt-1 text-xs font-semibold text-brand-600 underline dark:text-brand-400">Jetzt upgraden</Link>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-900/10 dark:text-red-400 dark:ring-red-800/40">
            <X className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {loading && (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <p className="text-sm text-zinc-500">{t("loading")}</p>
          </div>
        )}

        {searched && !loading && results.length === 0 && !limitReached && !errorMsg && (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-500">{t("no_results")}</p>
            <p className="text-xs text-zinc-400">{t("no_results_hint")}</p>
          </div>
        )}

        {/* ── Gruppierte Ansicht nach Bundesland ── */}
        {searched && !loading && results.length > 0 && viewMode === "grouped" && (
          <div className="flex flex-col gap-2">
            {groupedStates.map((state) => {
              const stateProps = grouped[state];
              const isOpen = openStates.has(state);
              return (
                <div
                  key={state}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <button
                    type="button"
                    onClick={() => toggleState(state)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <span className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
                      <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
                      {state}
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {stateProps.length}
                      </span>
                    </span>
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                    }
                  </button>
                  {isOpen && (
                    <div className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                      {stateProps.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedProperty(p)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={`h-2 w-2 shrink-0 rounded-full ${
                              p.property_analyses?.risk_level === "critical" ? "bg-red-500"
                              : p.property_analyses?.risk_level === "high"   ? "bg-orange-400"
                              : p.property_analyses?.risk_level === "medium" ? "bg-amber-400"
                              : p.property_analyses?.risk_level === "low"    ? "bg-green-400"
                              : "bg-zinc-300 dark:bg-zinc-600"
                            }`} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {p.address ?? p.city ?? "–"}
                                {p.address && p.city ? `, ${p.city}` : ""}{p.zip_code ? ` ${p.zip_code}` : ""}
                              </p>
                              <p className="truncate text-xs text-zinc-500">{p.court}</p>
                            </div>
                          </div>
                          <div className="ml-4 shrink-0 text-right">
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                              {p.market_value
                                ? `${p.market_value.toLocaleString("de-DE")} €`
                                : "k. A."}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {p.auction_date
                                ? new Date(p.auction_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })
                                : "Termin offen"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Karten-Ansicht (Grid) ── */}
        {searched && !loading && results.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {results.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onSelect={() => setSelectedProperty(property)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedProperty && (
        <PropertyModal
          property={selectedProperty}
          locale={locale}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}
