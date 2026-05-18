import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Database, RefreshCw, CheckCircle2, XCircle, Loader2, AlertTriangle, Layers, FileSearch } from "lucide-react";
import { CrawlerProgressPanel } from "./_components/crawler-progress-panel";
import { MarkFailedButton } from "./_components/mark-failed-button";
import { OcrRerunButton } from "./_components/ocr-rerun-button";
import { EnrichButton } from "./_components/enrich-button";
import { RefetchDocsButton } from "./_components/refetch-docs-button";

export default async function AdminCrawlerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const admin = createAdminClient();

  const [
    { count: propertyCount },
    { data: crawlerRuns },
  ] = await Promise.all([
    admin.from("properties").select("*", { count: "exact", head: true }),
    admin
      .from("crawler_runs")
      .select("id, started_at, finished_at, new_properties_count, updated_properties_count, status, error_message")
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  const statusIcon = {
    completed: CheckCircle2,
    failed: XCircle,
    running: Loader2,
  };
  const statusColor = {
    completed: "text-green-600",
    failed: "text-red-600",
    running: "text-blue-600",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("nav_crawler")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{propertyCount ?? 0} {t("stats_properties")}</p>
      </div>

      {/* Fortschrittsanzeige + Trigger */}
      <CrawlerProgressPanel />

      {/* Info Box */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
        <Database className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Der Crawler scraped das ZVG-Portal und importiert alle Zwangsversteigerungstermine aus allen 16 Bundesländern.
          Er wird täglich um 06:00 Uhr UTC automatisch gestartet oder kann hier manuell ausgelöst werden.
        </p>
      </div>

      {/* PDF-Dokumente neu abrufen */}
      <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <FileSearch className="h-4 w-4 text-emerald-600" /> PDF-Dokumente neu abrufen
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Durchsucht <strong>alle</strong> Objekte (auch bereits angereicherte) erneut auf PDF-Links beim ZVG-Portal.
          Hilfreich wenn der erste Enrichment-Durchlauf wegen Session-Problemen keine PDFs gefunden hat.
          Bereits heruntergeladene Dokumente werden nicht erneut gespeichert (idempotent).
        </p>
        <RefetchDocsButton />
      </div>

      {/* Detail-Anreicherung */}
      <div className="overflow-hidden rounded-xl border border-violet-200 bg-violet-50/50 p-5 dark:border-violet-900 dark:bg-violet-950/20">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <Layers className="h-4 w-4 text-violet-600" /> Detail-Anreicherung
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Laedt Detailseiten (Beschreibung, Grundbuch, Glaeubigerinfo) und Dokumente fuer alle
          noch unangereicherten Objekte. Verarbeitet ~30 Objekte pro Batch, laeuft automatisch
          durch bis alle Objekte abgearbeitet sind.
        </p>
        <EnrichButton />
      </div>

      {/* OCR-Verarbeitung */}
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <RefreshCw className="h-4 w-4 text-amber-600" /> OCR-Verarbeitung
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Startet OCR fuer alle Dokumente, die bereits in Supabase Storage gespeichert sind aber noch keinen extrahierten Text haben.
        </p>
        <OcrRerunButton />
      </div>

      {/* Crawler Runs Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            <RefreshCw className="h-4 w-4" /> {t("crawler_runs")}
          </h2>
        </div>
        {crawlerRuns && crawlerRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-700 dark:bg-zinc-800/50">
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("last_run")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("new_properties")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Aktualisiert</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">{t("duration")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Fehler</th>
                </tr>
              </thead>
              <tbody>
                {crawlerRuns.map((run) => {
                  const duration =
                    run.finished_at && run.started_at
                      ? Math.round(
                          (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000
                        )
                      : null;
                  const Icon = statusIcon[run.status as keyof typeof statusIcon] ?? AlertTriangle;
                  const color = statusColor[run.status as keyof typeof statusColor] ?? "text-zinc-500";

                  return (
                    <tr key={run.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {new Date(run.started_at).toLocaleString("de-DE")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${color}`}>
                          <Icon className={`h-3.5 w-3.5 ${run.status === "running" ? "animate-spin" : ""}`} />
                          {run.status === "completed" ? t("run_status_completed") : run.status === "failed" ? t("run_status_failed") : t("run_status_running")}
                        </span>
                        {run.status === "running" && <MarkFailedButton runId={run.id} />}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {run.new_properties_count ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {run.updated_properties_count ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {duration !== null ? `${duration}s` : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-red-500">
                        {run.error_message ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-8 text-sm text-zinc-500">
            <AlertTriangle className="h-4 w-4" /> Noch keine Crawler-Läufe vorhanden.
          </div>
        )}
      </div>
    </div>
  );
}
