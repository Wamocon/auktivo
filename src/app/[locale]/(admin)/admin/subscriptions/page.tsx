import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { CreditCard, TrendingUp, Crown } from "lucide-react";

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("nav_subscriptions")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{proCount ?? 0} {t("stats_pro")}</p>
      </div>

      {/* MRR estimate */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {((proCount ?? 0) * 9.99 * 12).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
              </p>
              <p className="text-xs text-zinc-500">ARR (geschätzt)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Pro-Abonnements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-700 dark:bg-zinc-800/50">
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("user_table_name")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("user_table_email")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("subscription_status")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Stripe ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Suchen/Monat</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("user_table_joined")}</th>
              </tr>
            </thead>
            <tbody>
              {subs?.map((s) => (
                <tr key={s.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{s.full_name ?? "-"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      s.subscription_status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {s.subscription_status ?? t("subscription_active")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {s.stripe_subscription_id ? s.stripe_subscription_id.slice(0, 18) + "..." : "-"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{s.monthly_search_count}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(s.created_at).toLocaleDateString("de-DE")}
                  </td>
                </tr>
              ))}
              {(!subs || subs.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500">
                    Keine Pro-Abonnements vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
