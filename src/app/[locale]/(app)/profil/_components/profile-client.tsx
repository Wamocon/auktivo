"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { User, Mail, Crown, Shield, LogOut, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/database";

interface ProfileClientProps {
  profile: Profile;
  email: string;
  locale: string;
}

export function ProfileClient({ profile, email, locale }: ProfileClientProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push(`/${locale}`);
  }

  async function handlePortal() {
    setLoading(true);
    const res = await fetch("/api/stripe/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "portal", locale }),
    });
    const data = await res.json() as { url?: string };
    if (data.url) window.location.href = data.url;
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Profile Info */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <User className="h-5 w-5" /> {t("personal_data")}
        </h2>
        <dl className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-zinc-500">{t("name")}</dt>
            <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{profile.full_name ?? "-"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1 text-sm text-zinc-500">
              <Mail className="h-3.5 w-3.5" /> {t("email")}
            </dt>
            <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{email}</dd>
          </div>
        </dl>
      </div>

      {/* Subscription */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <Crown className="h-5 w-5" /> {t("subscription")}
        </h2>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500">{t("current_plan")}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${profile.plan === "pro" ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
            {profile.plan === "pro" ? "Pro" : "Free"}
          </span>
        </div>
        {profile.plan === "pro" ? (
          <button
            onClick={handlePortal}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("manage_subscription")}
          </button>
        ) : (
          <a
            href={`/${locale}/upgrade`}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Crown className="h-4 w-4" /> {t("upgrade_to_pro")}
          </a>
        )}
      </div>

      {/* Privacy */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <Shield className="h-5 w-5" /> {t("data_privacy")}
        </h2>
        <p className="mb-4 text-sm text-zinc-500">{t("gdpr_notice")}</p>
        <div className="flex flex-col gap-2">
          <button className="rounded-full border border-zinc-300 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700">
            {t("export_data")}
          </button>
          <button className="rounded-full border border-red-300 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-700">
            {t("delete_account")}
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 rounded-full border border-zinc-300 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
      >
        <LogOut className="h-4 w-4" /> {t("logout")}
      </button>
    </div>
  );
}
