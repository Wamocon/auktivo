import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Crown } from "lucide-react";
import { AdminUsersClient } from "./_components/admin-users-client";

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
    .select("id, full_name, email, plan, user_type, is_admin, company_name, monthly_search_count, subscription_status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[Admin/Users] DB error:", error.message);
  }

  const freeCount = users?.filter((u) => u.plan !== "pro").length ?? 0;
  const proCount = users?.filter((u) => u.plan === "pro").length ?? 0;
  const adminCount = users?.filter((u) => u.is_admin).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("nav_users")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{users?.length ?? 0} {t("stats_users")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{users?.length ?? 0}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Gesamt</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{proCount}</p>
          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1"><Crown className="h-3 w-3" /> Pro-Nutzer</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{freeCount}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Free-Nutzer</p>
        </div>
      </div>

      {/* Table with client-side search */}
      <AdminUsersClient
        users={users ?? []}
        currentUserId={user.id}
        adminCount={adminCount}
      />
    </div>
  );
}
