import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { UpgradeClient } from "./_components/upgrade-client";

export default async function UpgradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("pricing");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
        <p className="mt-3 text-zinc-500">{t("subtitle")}</p>
      </div>
      <UpgradeClient locale={locale} isPro={profile?.plan === "pro"} />
    </div>
  );
}
