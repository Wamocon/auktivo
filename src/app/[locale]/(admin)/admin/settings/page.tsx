import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Settings, Info } from "lucide-react";
import { getAppSettings } from "@/lib/settings";
import { AdminSettingsClient } from "./_components/settings-client";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect(`/${locale}/dashboard`);

  const settings = await getAppSettings();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          <Settings className="h-6 w-6" />
          {t("app_settings")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Konfiguriere App-Verhalten, Limits und Crawler-Einstellungen.
        </p>
      </div>

      <AdminSettingsClient initialSettings={settings} />

      {/* Environment Info (read-only) */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <Info className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Umgebung (nur Anzeige)
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { label: "Node-Umgebung", value: process.env.NODE_ENV ?? "production" },
            { label: "DB-Schema", value: process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA ?? "public" },
            { label: "Vercel Region", value: process.env.VERCEL_REGION ?? "lokal" },
            {
              label: "Supabase URL",
              value: process.env.NEXT_PUBLIC_SUPABASE_URL
                ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
                : "nicht konfiguriert",
            },
            {
              label: "Stripe konfiguriert",
              value: process.env.STRIPE_SECRET_KEY ? "Ja" : "Nein",
            },
            {
              label: "App URL",
              value: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/60"
            >
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
              <span className="font-mono text-xs text-zinc-900 dark:text-zinc-50">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
