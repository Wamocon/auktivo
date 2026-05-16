import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { UserCog, Crown, Shield, Building2, User } from "lucide-react";
import { AdminUserActions } from "./_components/admin-user-actions";

export default async function AdminUsersPage({
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

  const { data: users, error } = await admin
    .from("profiles")
    .select("id, full_name, email, plan, user_type, is_admin, company_name, monthly_search_count, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[Admin/Users] DB error:", error.message);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("nav_users")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{users?.length ?? 0} {t("stats_users")}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-700 dark:bg-zinc-800/50">
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("user_table_name")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("user_table_email")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("user_table_plan")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("user_table_type")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("user_table_searches")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("user_table_joined")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("user_table_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.is_admin ? (
                        <Shield className="h-4 w-4 shrink-0 text-red-500" />
                      ) : (
                        <UserCog className="h-4 w-4 shrink-0 text-zinc-400" />
                      )}
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {u.full_name ?? "-"}
                      </span>
                      {u.is_admin && (
                        <span className="rounded bg-red-100 px-1 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        u.plan === "pro"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {u.plan === "pro" && <Crown className="h-3 w-3" />}
                      {u.plan === "pro" ? "Pro" : "Free"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      {u.user_type === "business" ? (
                        <><Building2 className="h-3.5 w-3.5" /> {u.company_name ?? "Business"}</>
                      ) : (
                        <><User className="h-3.5 w-3.5" /> Private</>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${
                      (u.monthly_search_count ?? 0) >= 5 && u.plan === "free"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {u.monthly_search_count ?? 0}/{ u.plan === "pro" ? "\u221e" : "5"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(u.created_at).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-4 py-3">
                    <AdminUserActions
                      userId={u.id}
                      currentPlan={u.plan as "free" | "pro"}
                      isAdmin={u.is_admin ?? false}
                      currentUserId={user.id}
                      fullName={u.full_name ?? null}
                      companyName={u.company_name ?? null}
                      userType={(u.user_type as "private" | "business") ?? "private"}
                      monthlySearchCount={u.monthly_search_count ?? 0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
