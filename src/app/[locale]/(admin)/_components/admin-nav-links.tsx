"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, Database, Settings } from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", icon: LayoutDashboard, labelKey: "nav_dashboard" },
  { key: "users", icon: Users, labelKey: "nav_users" },
  { key: "subscriptions", icon: CreditCard, labelKey: "nav_subscriptions" },
  { key: "crawler", icon: Database, labelKey: "nav_crawler" },
  { key: "settings", icon: Settings, labelKey: "nav_settings" },
] as const;

const LABELS: Record<string, string> = {
  nav_dashboard: "Übersicht",
  nav_users: "Nutzerverwaltung",
  nav_subscriptions: "Abonnierung",
  nav_crawler: "Crawler & Daten",
  nav_settings: "App-Einstellungen",
};

export function AdminNavLinks({ locale }: { locale: string }) {
  const pathname = usePathname();

  return (
    <>
      {NAV_ITEMS.map(({ key, icon: Icon, labelKey }) => {
        const href = `/${locale}/admin/${key}`;
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {LABELS[labelKey]}
          </Link>
        );
      })}
    </>
  );
}
