"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  User,
  Mail,
  Crown,
  Shield,
  LogOut,
  Loader2,
  Building2,
  Phone,
  Bell,
  Lock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Search,
  ChevronRight,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/database";

interface ProfileClientProps {
  profile: Profile;
  email: string;
  locale: string;
}

type Section = "general" | "personal" | "subscription" | "notifications" | "security";
type SaveStatus = "idle" | "saving" | "success" | "error";

export function ProfileClient({ profile, email, locale }: ProfileClientProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const supabase = createBrowserClient();

  const [activeSection, setActiveSection] = useState<Section>("general");

  // Form state
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [companyName, setCompanyName] = useState(profile.company_name ?? "");
  const [userType, setUserType] = useState<"private" | "business">(profile.user_type ?? "private");
  const [emailNotifications, setEmailNotifications] = useState(profile.email_notifications ?? true);
  const [newPassword, setNewPassword] = useState("");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleSave() {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          company_name: userType === "business" ? companyName : null,
          user_type: userType,
          email_notifications: emailNotifications,
        }),
      });

      if (!res.ok) throw new Error("Profile update failed");

      if (newPassword && newPassword.length >= 8) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setNewPassword("");
      }

      setSaveStatus("success");
      router.refresh();
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push(`/${locale}`);
  }

  async function handlePortal() {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "portal", locale }),
    });
    const data = await res.json() as { url?: string };
    if (data.url) window.location.href = data.url;
    setPortalLoading(false);
  }

  const saveIcon = {
    idle: null,
    saving: <Loader2 className="h-4 w-4 animate-spin" />,
    success: <CheckCircle2 className="h-4 w-4" />,
    error: <AlertCircle className="h-4 w-4" />,
  };
  const saveLabel = {
    idle: t("save_changes"),
    saving: t("save_changes"),
    success: t("saved_success"),
    error: "Fehler",
  };
  const saveStyle = {
    idle: "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900",
    saving: "bg-zinc-900 text-white opacity-70 cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900",
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
  };

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    locale === "de" ? "de-DE" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const sections: { key: Section; label: string; icon: React.ElementType }[] = [
    { key: "general", label: t("section_general"), icon: User },
    { key: "personal", label: t("section_personal"), icon: Building2 },
    { key: "subscription", label: t("section_subscription"), icon: Crown },
    { key: "notifications", label: t("section_notifications"), icon: Bell },
    { key: "security", label: t("section_security"), icon: Lock },
  ];

  return (
    <div className="flex min-h-150 gap-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        {/* Profile overview in sidebar */}
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {(profile.full_name ?? email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {profile.full_name ?? email.split("@")[0]}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  profile.plan === "pro"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}>
                  {profile.plan === "pro" ? "Pro" : "Free"}
                </span>
                {profile.is_admin && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {t("role_admin")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {sections.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeSection === key
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {activeSection === key && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
            </button>
          ))}
        </nav>

        {/* Logout at bottom */}
        <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* General */}
        {activeSection === "general" && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t("section_general")}</h2>
              <p className="mt-0.5 text-sm text-zinc-500">{memberSince}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                  <Calendar className="h-3.5 w-3.5" /> {t("member_since")}
                </div>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{memberSince}</p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                  <Search className="h-3.5 w-3.5" /> {t("searches_used")}
                </div>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{profile.monthly_search_count}</p>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("name")}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Max Mustermann"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <Mail className="h-3.5 w-3.5" /> {t("email")}
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                disabled
                className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className={`flex items-center justify-center gap-2 self-start rounded-full px-6 py-2.5 text-sm font-semibold transition-colors ${saveStyle[saveStatus]}`}
            >
              {saveIcon[saveStatus]}
              {saveLabel[saveStatus]}
            </button>
          </div>
        )}

        {/* Personal Data */}
        {activeSection === "personal" && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t("section_personal")}</h2>
              <p className="mt-0.5 text-sm text-zinc-500">{t("account_type_hint")}</p>
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <Phone className="h-3.5 w-3.5" /> {t("phone")}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phone_placeholder")}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("account_type")}</label>
              <div className="grid grid-cols-2 gap-3">
                {(["private", "business"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setUserType(type)}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                      userType === type
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {type === "business" ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    {type === "private" ? t("account_type_private") : t("account_type_business")}
                  </button>
                ))}
              </div>
              {userType === "business" && (
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("company_name")}</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t("company_name_placeholder")}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
                  />
                </div>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className={`flex items-center justify-center gap-2 self-start rounded-full px-6 py-2.5 text-sm font-semibold transition-colors ${saveStyle[saveStatus]}`}
            >
              {saveIcon[saveStatus]}
              {saveLabel[saveStatus]}
            </button>
          </div>
        )}

        {/* Subscription */}
        {activeSection === "subscription" && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t("section_subscription")}</h2>
              <p className="mt-0.5 text-sm text-zinc-500">{t("upgrade_hint")}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">{t("current_plan")}</span>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  profile.plan === "pro"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}>
                  {profile.plan === "pro" ? "Pro" : "Free"}
                </span>
              </div>
            </div>
            {profile.plan === "pro" ? (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="flex items-center justify-center gap-2 self-start rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300"
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("manage_subscription")}
              </button>
            ) : (
              <a
                href={`/${locale}/upgrade`}
                className="flex items-center justify-center gap-2 self-start rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
              >
                <Crown className="h-4 w-4" /> {t("upgrade_to_pro")}
              </a>
            )}
          </div>
        )}

        {/* Notifications */}
        {activeSection === "notifications" && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t("section_notifications")}</h2>
              <p className="mt-0.5 text-sm text-zinc-500">{t("email_notifications_desc")}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{t("email_notifications")}</span>
                  <p className="mt-0.5 text-xs text-zinc-500">{t("email_notifications_desc")}</p>
                </div>
                {emailNotifications ? (
                  <button
                    onClick={() => setEmailNotifications(false)}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-zinc-900 transition-colors dark:bg-zinc-100"
                    role="switch"
                  aria-checked="true"
                    aria-label={t("email_notifications")}
                  >
                    <span className="pointer-events-none inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow ring-0 transition-transform dark:bg-zinc-900" />
                  </button>
                ) : (
                  <button
                    onClick={() => setEmailNotifications(true)}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-zinc-200 transition-colors dark:bg-zinc-700"
                    role="switch"
                  aria-checked="false"
                    aria-label={t("email_notifications")}
                  >
                    <span className="pointer-events-none inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow ring-0 transition-transform dark:bg-zinc-900" />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className={`flex items-center justify-center gap-2 self-start rounded-full px-6 py-2.5 text-sm font-semibold transition-colors ${saveStyle[saveStatus]}`}
            >
              {saveIcon[saveStatus]}
              {saveLabel[saveStatus]}
            </button>
          </div>
        )}

        {/* Security */}
        {activeSection === "security" && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t("section_security")}</h2>
              <p className="mt-0.5 text-sm text-zinc-500">{t("change_password_hint")}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("new_password")}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("new_password_placeholder")}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className={`flex items-center justify-center gap-2 self-start rounded-full px-6 py-2.5 text-sm font-semibold transition-colors ${saveStyle[saveStatus]}`}
            >
              {saveIcon[saveStatus]}
              {saveLabel[saveStatus]}
            </button>
            <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <Shield className="h-4 w-4" /> {t("data_privacy")}
              </h3>
              <p className="mb-4 text-xs text-zinc-500">{t("gdpr_notice")}</p>
              <div className="flex flex-col gap-2">
                <button className="rounded-full border border-zinc-300 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">
                  {t("export_data")}
                </button>
                <button className="rounded-full border border-red-300 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400">
                  {t("delete_account")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
