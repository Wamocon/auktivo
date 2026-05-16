import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";
import { RiskBadge } from "@/components/ui/risk-badge";
import { PropertyTabs } from "./_components/property-tabs";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ExternalLink, Heart, MessageSquare, AlertTriangle } from "lucide-react";
import type { Property, PropertyAnalysis, PropertyDocument } from "@/lib/types/database";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("property");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const isPro = profile?.plan === "pro";

  const admin = createAdminClient();
  const [{ data: property }, { data: analysis }, { data: isFavorite }, { data: documents }] = await Promise.all([
    admin.from("properties").select("*").eq("id", id).single(),
    admin.from("property_analyses").select("*").eq("property_id", id).single(),
    supabase.from("favorites").select("id").eq("user_id", user.id).eq("property_id", id).single(),
    admin.from("property_documents").select("*").eq("property_id", id).order("created_at"),
  ]);

  if (!property) redirect(`/${locale}/suche`);

  const p = property as Property;
  const a = analysis as PropertyAnalysis | null;
  const docs = (documents ?? []) as PropertyDocument[];

  const minBid = p.minimum_bid ?? (p.market_value ? Math.round(p.market_value * 0.5) : null);
  const discount =
    p.market_value && minBid
      ? Math.round(((p.market_value - minBid) / p.market_value) * 100)
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Zurueck */}
      <Link
        href="/suche"
        locale={locale}
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        &larr; Zurueck zur Suche
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Hauptbereich mit Tabs */}
        <div className="lg:col-span-2">
          {/* Objekt-Header */}
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex flex-wrap items-start gap-3">
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {t(`types.${p.property_type ?? "other"}` as Parameters<typeof t>[0])}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                  p.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {t(`status.${p.status}` as Parameters<typeof t>[0])}
              </span>
              {a?.risk_level && isPro && <RiskBadge level={a.risk_level} />}
            </div>

            <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {p.address ? `${p.address}` : p.city}
            </h1>
            <p className="mb-1 text-sm text-zinc-500">
              {p.zip_code} {p.city}
              {p.state ? `, ${p.state}` : ""}
            </p>
            <p className="text-xs text-zinc-400">
              {p.court}
              {p.court_file_number ? ` &middot; Az. ${p.court_file_number}` : ""}
              {p.auction_date
                ? ` &middot; Termin: ${new Date(p.auction_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </p>

            {/* Werte-Leiste */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {p.market_value ? (
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
                  <p className="mb-0.5 text-xs text-zinc-500">{t("market_value")}</p>
                  <p className="text-base font-black text-zinc-900 dark:text-zinc-50">
                    {p.market_value.toLocaleString("de-DE")} EUR
                  </p>
                </div>
              ) : (
                <div className="col-span-2 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 sm:col-span-1">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Kein Verkehrswert angegeben
                </div>
              )}
              {minBid && (
                <div className="rounded-xl bg-brand-50 p-3 dark:bg-brand-900/20">
                  <p className="mb-0.5 text-xs text-brand-600 dark:text-brand-400">{t("minimum_bid")} (ca.)</p>
                  <p className="text-base font-black text-brand-700 dark:text-brand-300">
                    ~{minBid.toLocaleString("de-DE")} EUR
                  </p>
                  {discount !== null && (
                    <p className="mt-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                      -{discount}% unter Verkehrswert
                    </p>
                  )}
                </div>
              )}
              {p.auction_date && (
                <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
                  <p className="mb-0.5 text-xs text-zinc-500">{t("auction_date")}</p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {new Date(p.auction_date).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tabs-Bereich */}
          <PropertyTabs
            property={p}
            analysis={isPro ? a : null}
            documents={docs}
            isPro={isPro}
            locale={locale}
          />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          {/* Aktions-Karten */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-3">
              <a
                href="https://www.zvg-portal.de"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              >
                <ExternalLink className="h-4 w-4" /> {t("bid_now")}
              </a>

              {isPro ? (
                <>
                  <Link
                    href={{ pathname: "/objekte/[id]/chat", params: { id } }}
                    locale={locale}
                    className="flex items-center justify-center gap-2 rounded-full border border-brand-300 bg-brand-50 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                  >
                    <MessageSquare className="h-4 w-4" /> {t("start_chat")}
                  </Link>
                  <button className="flex items-center justify-center gap-2 rounded-full border border-zinc-300 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">
                    <Heart
                      className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
                    />
                    {isFavorite ? t("remove_favorite") : t("add_favorite")}
                  </button>
                </>
              ) : (
                <Link
                  href="/upgrade"
                  className="flex items-center justify-center gap-2 rounded-full border border-brand-300 bg-brand-50 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                >
                  Pro-Features freischalten
                </Link>
              )}
            </div>
          </div>

          {/* ZVG-ID Kurzinfo */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Verfahrensdaten</p>
            <dl className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">ZVG-ID</dt>
                <dd className="font-mono text-zinc-700 dark:text-zinc-300">{p.zvg_id}</dd>
              </div>
              {p.court_file_number && (
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Aktenzeichen</dt>
                  <dd className="font-mono text-zinc-700 dark:text-zinc-300">{p.court_file_number}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Dokumente</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">
                  {docs.length > 0 ? docs.length : p.document_urls.length} verfugbar
                </dd>
              </div>
              {a?.analyzed_at && isPro && (
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">KI-Analyse</dt>
                  <dd className="text-zinc-700 dark:text-zinc-300">
                    {new Date(a.analyzed_at).toLocaleDateString("de-DE")}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Disclaimer */}
          <AiDisclaimer variant="short" />
        </div>
      </div>
    </div>
  );
}
