import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ProGate } from "@/components/ui/pro-gate";
import { AlertsClient } from "./_components/alerts-client";
import type { SearchAlert } from "@/lib/types/database";

export default async function AlarmePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("alerts");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const isPro = profile?.plan === "pro";

  if (!isPro) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
        <ProGate isPro={false} upgradeHref={`/${locale}/upgrade`} featureName="Suchalarm">
          <div className="h-48 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </ProGate>
      </div>
    );
  }

  const { data: alerts } = await supabase
    .from("search_alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
      <AlertsClient initialAlerts={(alerts as SearchAlert[]) ?? []} />
    </div>
  );
}
