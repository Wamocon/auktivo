import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { CreditCard, TrendingUp, Crown } from "lucide-react";
import { AdminSubscriptionsClient } from "./_components/admin-subscriptions-client";

export default async function AdminSubscriptionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const admin = createAdminClient();

  const { data: subs } = await admin
    .from("profiles")
    .select("id, full_name, email, plan, subscription_status, stripe_subscription_id, stripe_customer_id, monthly_search_count, created_at")
    .neq("plan", "free")
    .order("created_at", { ascending: false });

  const { count: proCount } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("plan", "pro");

  const activeCount = subs?.filter((s) => s.subscription_status === "active").length ?? 0;
  const cancelledCount = subs?.filter((s) => s.subscription_status === "cancelled").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("nav_subscriptions")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{proCount ?? 0} {t("stats_pro")}</p>
      </div>

      {/* Metriken */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/20">
              <Crown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{proCount ?? 0}</p>
              <p className="text-xs text-zinc-500">{t("stats_pro")}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/20">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {((proCount ?? 0) * 9.99).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
              <p className="text-xs text-zinc-500">MRR (geschätzt)</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/20">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{activeCount}</p>
              <p className="text-xs text-zinc-500">Aktiv</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{cancelledCount}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Gekündigt</p>
          </div>
        </div>
      </div>

      {/* Abonnements-Tabelle mit Client-seitiger Suche + Aktionen */}
      <AdminSubscriptionsClient subs={subs ?? []} />
    </div>
  );
}
