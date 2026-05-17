import { getAuthUser, getProfile } from "@/lib/supabase/cached-queries";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Clock, TrendingUp, Zap } from "lucide-react";
import type { Profile } from "@/lib/types/database";
import { PropertiesByStateAccordion } from "./_components/properties-by-state-accordion";

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

  // Use cached queries - deduplicated with layout, no extra DB roundtrip
  const user = await getAuthUser();
  if (!user) redirect(`/${locale}/login`);

  const supabase = await createClient();

  const [profile, { data: recentProperties }, { data: allProperties }, { data: lastCrawlerRun }] =
    await Promise.all([
      getProfile(user.id),
      supabase
        .from("properties")
        .select("id")
        .eq("status", "active")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from("properties")
        .select("id, city, zip_code, state, court, court_file_number, property_type, address, objekt_lage, market_value, minimum_bid, auction_date, status")
        .eq("status", "active")
        .order("state", { ascending: true })
        .order("auction_date", { ascending: true }),
      supabase
        .from("crawler_runs")
        .select("started_at, finished_at, status")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const p = profile as Profile | null;
  const isPro = p?.plan === "pro";
  const searchLimit = 5;
  const searchUsed = Math.min(p?.monthly_search_count ?? 0, searchLimit);
  const newPropertiesCount = recentProperties?.length ?? 0;

  // Alle aktiven Objekte nach Bundesland gruppieren
  const propertiesByState: Record<string, typeof allProperties extends (infer T)[] | null ? NonNullable<T>[] : never[]> = {};
  for (const prop of allProperties ?? []) {
    const key = prop.state ?? "Unbekannt";
    (propertiesByState[key] ??= []).push(prop);
  }

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
            {t("welcome", { name: p?.full_name?.split(" ")[0] ?? t("title") })}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {new Date().toLocaleDateString(locale === "de" ? "de-DE" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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
            {newPropertiesCount}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Clock className="h-4 w-4" /> {t("search_count", { used: searchUsed, limit: searchLimit }).split(" ").slice(0, 3).join(" ")}
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
                  ref={(el) => { if (el) el.style.width = `${Math.round((searchUsed / searchLimit) * 100)}%`; }}
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
                {lastCrawlerRun.status === "completed" ? (locale === "de" ? "Aktuell" : "Up to date") : (locale === "de" ? "Fehler" : "Error")}
              </div>
              <div className="text-xs text-zinc-500">
                {new Date(lastCrawlerRun.finished_at ?? lastCrawlerRun.started_at).toLocaleString(locale === "de" ? "de-DE" : "en-US")}
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500">{locale === "de" ? "Kein Lauf" : "No runs yet"}</div>
          )}
        </div>
      </div>

      {/* Alle Objekte nach Bundesland */}
      <div className="mt-8">
        <PropertiesByStateAccordion propertiesByState={propertiesByState} />
      </div>

      {!isPro && (
        <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-6 dark:border-brand-800/50 dark:bg-brand-900/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                {locale === "de" ? "Mehr mit Pro" : "More with Pro"}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {locale === "de"
                  ? "KI-Analyse, Chat-Assistent, Favoriten und Suchalarm für 9,99 EUR/Monat."
                  : "AI analysis, chat assistant, favorites and search alerts for €9.99/month."}
              </p>
            </div>
            <Link
              href="/upgrade"
              className="flex shrink-0 items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <Zap className="h-4 w-4" /> {t("upgrade_cta")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
