import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { RiskBadge } from "@/components/ui/risk-badge";
import { ChevronRight, Clock, TrendingUp, Zap } from "lucide-react";
import type { Profile, PropertyWithAnalysis } from "@/lib/types/database";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ upgrade?: string }>;
}) {
  const { locale } = await params;
  const { upgrade } = await searchParams;
  const t = await getTranslations("dashboard");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [{ data: profile }, { data: recentProperties }, { data: lastCrawlerRun }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("properties")
        .select("*, property_analyses(risk_level, summary, analysis_status)")
        .eq("status", "active")
        .gte("created_at", new Date(new Date().setDate(new Date().getDate() - 7)).toISOString())
        .order("auction_date", { ascending: true })
        .limit(6),
      supabase
        .from("crawler_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .single(),
    ]);

  const p = profile as Profile;
  const isPro = p?.plan === "pro";
  const searchLimit = 5;
  const searchUsed = Math.min(p?.monthly_search_count ?? 0, searchLimit);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Upgrade Success Banner */}
      {upgrade === "success" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
          <Zap className="h-4 w-4" />
          <span>Pro wurde erfolgreich aktiviert. Alle Features sind jetzt freigeschaltet.</span>
        </div>
      )}

      {/* Welcome */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("welcome", { name: p?.full_name?.split(" ")[0] ?? "Willkommen" })}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {new Date().toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        {!isPro && (
          <Link
            href="/upgrade"
            className="flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Zap className="h-4 w-4" /> {t("upgrade_cta")}
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <TrendingUp className="h-4 w-4" /> {t("new_properties")}
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {recentProperties?.length ?? 0}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Clock className="h-4 w-4" /> Suchen diesen Monat
          </div>
          {isPro ? (
            <div className="text-3xl font-bold text-brand-600">{t("search_unlimited")}</div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {searchUsed} / {searchLimit}
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-1.5 rounded-full bg-brand-500 transition-all"
                  style={{ width: `${(searchUsed / searchLimit) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Clock className="h-4 w-4" /> {t("crawler_status")}
          </div>
          {lastCrawlerRun ? (
            <div>
              <div className={`text-sm font-medium ${lastCrawlerRun.status === "completed" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                {lastCrawlerRun.status === "completed" ? "Aktuell" : "Fehler"}
              </div>
              <div className="text-xs text-zinc-500">
                {new Date(lastCrawlerRun.finished_at ?? lastCrawlerRun.started_at).toLocaleString("de-DE")}
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500">Kein Lauf</div>
          )}
        </div>
      </div>

      {/* Recent Properties */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {t("new_properties")}
        </h2>
        <Link
          href="/suche"
          className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          {t("view_all")} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(recentProperties as PropertyWithAnalysis[] ?? []).map((property) => (
          <Link
            key={property.id}
            href={{ pathname: "/objekte/[id]", params: { id: property.id } }}
            className="group rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {property.property_type === "house" ? "Haus" :
                 property.property_type === "apartment" ? "Wohnung" :
                 property.property_type === "commercial" ? "Gewerbe" : "Objekt"}
              </span>
              {property.property_analyses?.risk_level && (
                <RiskBadge level={property.property_analyses.risk_level} />
              )}
            </div>
            <h3 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-50">
              {property.city}, {property.zip_code}
            </h3>
            <p className="mb-3 text-xs text-zinc-500">{property.court}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {property.market_value?.toLocaleString("de-DE")} EUR
              </span>
              <span className="text-xs text-zinc-400">
                {property.auction_date
                  ? new Date(property.auction_date).toLocaleDateString("de-DE")
                  : "Termin offen"}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {!isPro && (
        <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-6 dark:border-brand-800/50 dark:bg-brand-900/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Mehr mit Pro
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                KI-Analyse, Chat-Assistent, Favoriten und Suchalarm fuer 9,99 EUR/Monat.
              </p>
            </div>
            <Link
              href="/upgrade"
              className="flex shrink-0 items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <Zap className="h-4 w-4" /> Jetzt upgraden
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
