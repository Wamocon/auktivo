"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Search, Filter, Lock, Loader2, MapPin, Building2, Calendar, TrendingUp } from "lucide-react";
import { RiskBadge } from "@/components/ui/risk-badge";
import { daysUntil } from "@/lib/utils/date";
import type { Profile, PropertyWithAnalysis, RiskLevel, PropertyType } from "@/lib/types/database";

interface SearchClientProps {
  profile: Profile;
  locale: string;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: "Haus",
  apartment: "Wohnung",
  commercial: "Gewerbe",
  land: "Grundstueck",
  other: "Sonstiges",
};


function PropertyCard({ property, locale }: { property: PropertyWithAnalysis; locale: string }) {
  const days = daysUntil(property.auction_date ?? null);

  return (
    <Link
      href={{ pathname: "/objekte/[id]", params: { id: property.id } }}
      locale={locale}
      className="group flex flex-col rounded-2xl bg-white shadow-sm shadow-zinc-950/5 ring-1 ring-zinc-950/5 transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-zinc-900 dark:ring-white/5 dark:hover:ring-white/10"
    >
      <div className={`h-1 w-full rounded-t-2xl ${
        property.property_analyses?.risk_level === "critical" ? "bg-red-500" :
        property.property_analyses?.risk_level === "high" ? "bg-orange-400" :
        property.property_analyses?.risk_level === "medium" ? "bg-amber-400" :
        property.property_analyses?.risk_level === "low" ? "bg-green-400" :
        "bg-zinc-200 dark:bg-zinc-700"
      }`} />

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            <Building2 className="h-3 w-3" />
            {PROPERTY_TYPE_LABELS[property.property_type ?? "other"] ?? "Objekt"}
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
            <div className={`rounded-lg px-2.5 py-1.5 text-center ${
              days <= 7
                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                : days <= 21
                ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}>
              <p className="flex items-center gap-1 text-[10px] font-medium">
                <Calendar className="h-2.5 w-2.5" /> Termin in
              </p>
              <p className="text-sm font-black">{days}d</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function SearchClient({ profile, locale }: SearchClientProps) {
  const t = useTranslations("search");
  const isPro = profile.plan === "pro";

  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState<number>(25);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PropertyWithAnalysis[]>([]);
  const [searched, setSearched] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setLimitReached(false);

    const params = new URLSearchParams();
    if (zip) params.set("zip", zip);
    params.set("radius", String(radius));
    if (propertyTypes.length) params.set("types", propertyTypes.join(","));

    const res = await fetch(`/api/search?${params.toString()}`);
    const data = await res.json() as { properties?: PropertyWithAnalysis[]; limitReached?: boolean; error?: string };

    if (data.limitReached) { setLimitReached(true); }
    else if (data.error) { setErrorMsg(data.error); }
    else { setResults(data.properties ?? []); }

    setSearched(true);
    setLoading(false);
  }

  const propertyTypeOptions: { value: PropertyType; label: string }[] = [
    { value: "house", label: t("property_types.house") },
    { value: "apartment", label: t("property_types.apartment") },
    { value: "commercial", label: t("property_types.commercial") },
    { value: "land", label: t("property_types.land") },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <aside className="lg:col-span-1">
        <form
          onSubmit={handleSearch}
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/5"
        >
          <h2 className="mb-5 flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
            <Filter className="h-4 w-4 text-brand-500" /> Filter
          </h2>

          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">PLZ</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder={t("zip_placeholder")}
                maxLength={5}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition-all placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:bg-zinc-800"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("radius")}</label>
              <div className="grid grid-cols-4 gap-1">
                {[10, 25, 50, 100].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadius(r)}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                      radius === r ? "bg-brand-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>

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
                        else setPropertyTypes(propertyTypes.filter((t) => t !== value));
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-brand-500 focus:ring-brand-500 dark:border-zinc-600"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="relative">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t("risk_level")}
                {!isPro && <Lock className="h-3 w-3 text-zinc-300" />}
              </label>
              <div className={`flex flex-col gap-2 ${!isPro ? "pointer-events-none opacity-30" : ""}`}>
                {(["low", "medium", "high", "critical"] as RiskLevel[]).map((level) => (
                  <label key={level} className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" disabled={!isPro} className="h-4 w-4 rounded border-zinc-300 text-brand-500" />
                    <RiskBadge level={level} />
                  </label>
                ))}
              </div>
              {!isPro && (
                <Link href="/upgrade" className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100/90 text-xs font-semibold text-brand-600 backdrop-blur-sm dark:bg-zinc-800/90">
                  <TrendingUp className="h-3 w-3" /> Pro freischalten
                </Link>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !zip}
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
              {profile.monthly_search_count} / 5 Suchen diesen Monat
            </p>
            <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/40">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${Math.min(100, (profile.monthly_search_count / 5) * 100)}%` }}
              />
            </div>
            <Link href="/upgrade" className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Upgrade auf Pro &rarr;
            </Link>
          </div>
        )}
      </aside>

      <div className="lg:col-span-3">
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
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-900/10 dark:text-red-400 dark:ring-red-800/40">
            {errorMsg}
          </div>
        )}

        {searched && !limitReached && !errorMsg && (
          <p className="mb-4 text-sm font-medium text-zinc-500">{t("results", { count: results.length })}</p>
        )}

        {!searched && !loading && (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Search className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500">PLZ eingeben und suchen</p>
            <p className="text-xs text-zinc-400">z.B. 80539 fuer Muenchen-Innenstadt</p>
          </div>
        )}

        {searched && results.length === 0 && !limitReached && !errorMsg && (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-500">{t("no_results")}</p>
            <p className="text-xs text-zinc-400">Versuche einen groesseren Umkreis</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {results.map((property) => (
            <PropertyCard key={property.id} property={property} locale={locale} />
          ))}
        </div>
      </div>
    </div>
  );
}
