"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuktivoLogo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { Profile } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Menu, X, ChevronRight, ShieldAlert } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  profile?: Profile | null;
  locale: string;
}

export function Header({ profile, locale }: HeaderProps) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const isLoggedIn = !!profile;
  const isPro = profile?.plan === "pro";
  const isAdmin = profile?.is_admin === true;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" locale={locale} className="shrink-0">
          <AuktivoLogo className="h-7 w-auto" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" locale={locale} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                {t("dashboard")}
              </Link>
              <Link href="/suche" locale={locale} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                {t("search")}
              </Link>
              {isPro && (
                <Link href="/empfehlungen" locale={locale} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                  {t("recommendations")}
                </Link>
              )}
              {isAdmin && (
                <a
                  href={`/${locale}/admin/dashboard`}
                  className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <ShieldAlert className="h-3 w-3" /> {t("admin")}
                </a>
              )}
              {!isPro && (
                <Link
                  href="/upgrade"
                  locale={locale}
                  className="flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
                >
                  {t("upgrade")} <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/suche" locale={locale} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                {t("search")}
              </Link>
              <Link href="/preise" locale={locale} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                {t("pricing")}
              </Link>
              <Link href="/faq" locale={locale} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                {t("faq")}
              </Link>
            </>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />

          {isLoggedIn ? (
            <div className="hidden items-center gap-3 md:flex">
              <Link href="/profil" locale={locale} className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                {profile?.full_name?.split(" ")[0] ?? t("profile")}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {t("logout")}
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" locale={locale} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                {t("login")}
              </Link>
              <Link
                href="/registrieren"
                locale={locale}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {t("register")}
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <nav className="flex flex-col gap-4">
            <Link href="/suche" locale={locale} className="text-sm font-medium" onClick={() => setMenuOpen(false)}>{t("search")}</Link>
            <Link href="/preise" locale={locale} className="text-sm font-medium" onClick={() => setMenuOpen(false)}>{t("pricing")}</Link>
            <Link href="/faq" locale={locale} className="text-sm font-medium" onClick={() => setMenuOpen(false)}>{t("faq")}</Link>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" locale={locale} className="text-sm font-medium" onClick={() => setMenuOpen(false)}>{t("dashboard")}</Link>
                {isPro && (
                  <Link href="/empfehlungen" locale={locale} className="text-sm font-medium" onClick={() => setMenuOpen(false)}>{t("recommendations")}</Link>
                )}
                <Link href="/profil" locale={locale} className="text-sm font-medium" onClick={() => setMenuOpen(false)}>{t("profile")}</Link>
                {isAdmin && (
                  <a href={`/${locale}/admin/dashboard`} className="text-sm font-semibold text-red-600" onClick={() => setMenuOpen(false)}>{t("admin")}</a>
                )}
                <button onClick={handleLogout} className="text-left text-sm font-medium text-red-600">{t("logout")}</button>
              </>
            ) : (
              <>
                <Link href="/login" locale={locale} className="text-sm font-medium" onClick={() => setMenuOpen(false)}>{t("login")}</Link>
                <Link href="/registrieren" locale={locale} className="text-sm font-semibold text-brand-600" onClick={() => setMenuOpen(false)}>{t("register")}</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
