import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { RiskBadge } from "@/components/ui/risk-badge";
import { ProGate } from "@/components/ui/pro-gate";
import type { PropertyWithAnalysis } from "@/lib/types/database";

export default async function FavoritenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("favorites");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const isPro = profile?.plan === "pro";

  if (!isPro) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
        <ProGate isPro={false} upgradeHref={`/${locale}/upgrade`} featureName="Favoriten">
          <div className="h-48 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </ProGate>
      </div>
    );
  }

  const { data: favorites } = await supabase
    .from("favorites")
    .select("property_id, properties(*, property_analyses(risk_level))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const properties = favorites?.map((f) => f.properties).filter(Boolean) as unknown as PropertyWithAnalysis[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("title")}</h1>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">{t("empty")}</p>
          <Link href="/suche" className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            Zur Suche
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={{ pathname: "/objekte/[id]", params: { id: property.id } }}
              locale={locale}
              className="group rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {property.city}, {property.zip_code}
                </span>
                {property.property_analyses?.risk_level && (
                  <RiskBadge level={property.property_analyses.risk_level} />
                )}
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{property.court}</h3>
              <p className="mt-2 text-sm font-medium text-zinc-700">{property.market_value?.toLocaleString("de-DE")} EUR</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
