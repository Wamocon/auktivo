import { getAuthUser, getProfile } from "@/lib/supabase/cached-queries";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ProfileClient } from "./_components/profile-client";
import type { Profile } from "@/lib/types/database";

export default async function ProfilPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("profile");

  // getAuthUser + getProfile sind via React.cache dedupliziert:
  // kein doppelter DB-Aufruf wenn Layout sie bereits ausgefuehrt hat
  const user = await getAuthUser();
  if (!user) redirect(`/${locale}/login`);

  const profileData = await getProfile(user!.id);
  const profile = (profileData ?? {
    id: user!.id,
    email: user!.email ?? "",
    full_name: null,
    plan: "free",
    user_type: "private",
    is_admin: false,
    phone: null,
    company_name: null,
    email_notifications: true,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    monthly_search_count: 0,
    monthly_search_reset_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }) as Profile;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
      <ProfileClient profile={profile} email={user!.email ?? profile.email} locale={locale} />
    </div>
  );
}
