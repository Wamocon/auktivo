import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Settings, Shield, Clock, Info } from "lucide-react";

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

  const crawlerSchedule = process.env.CRAWLER_SCHEDULE ?? "Daily at 02:00 UTC";
  const autoStartEnabled = process.env.CRAWLER_AUTO_START === "true";

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          <Settings className="h-6 w-6" />
          {t("app_settings")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t("nav_settings")}
        </p>
      </div>

      {/* Maintenance Mode */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {t("maintenance_mode")}
          </h2>
        </div>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          {t("maintenance_mode_desc")}
        </p>
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {t("maintenance_mode")}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("maintenance_mode_desc")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
              Active
            </span>
          </div>
        </div>
      </section>

      {/* Crawler Settings */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {t("crawler_schedule")}
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {t("crawler_schedule")}
              </p>
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {crawlerSchedule}
              </p>
            </div>
            <Clock className="h-4 w-4 text-zinc-400" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Auto-Start (CRAWLER_AUTO_START)
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Automatically starts crawler on server boot
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                autoStartEnabled
                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
              }`}
            >
              {autoStartEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
      </section>

      {/* Environment Info */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Environment
          </h2>
        </div>
        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex justify-between">
            <span>Node Environment</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-50">
              {process.env.NODE_ENV ?? "production"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>DB Schema</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-50">
              {process.env.SUPABASE_DB_SCHEMA ?? "public"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Vercel Region</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-50">
              {process.env.VERCEL_REGION ?? "local"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
