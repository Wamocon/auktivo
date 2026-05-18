import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Lightbulb } from "lucide-react";
import { RecommendationEngine } from "./_components/recommendation-engine";
import { ProGate } from "@/components/ui/pro-gate";

export default async function EmpfehlungenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("recommendations");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const isPro = profile?.plan === "pro";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-brand-500" />
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("subtitle")}
        </p>
      </div>

      {!isPro ? (
        <ProGate isPro={false} upgradeHref={`/${locale}/upgrade`} featureName={t("pro_feature_name")}>
          <div className="h-64 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        </ProGate>
      ) : (
        <RecommendationEngine locale={locale} />
      )}
    </div>
  );
}
