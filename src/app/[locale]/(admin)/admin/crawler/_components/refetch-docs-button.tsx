"use client";

import { useState, useCallback } from "react";
import { Loader2, FileSearch, CheckCircle2, AlertTriangle } from "lucide-react";

interface RefetchDocsResult {
  processed?: number;
  docsFound?: number;
  remaining?: number;
  nextOffset?: number;
  error?: string;
}

export function RefetchDocsButton() {
  const [running, setRunning] = useState(false);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [totalDocsFound, setTotalDocsFound] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setDone(false);
    setError(null);
    setTotalProcessed(0);
    setTotalDocsFound(0);
    setTotalCount(0);
    setRemaining(null);

    let offset = 0;
    let initialTotal = 0;

    while (true) {
      try {
        const res = await fetch(
          `/api/admin/crawler/refetch-docs?batch=20&offset=${offset}`,
          { method: "POST" }
        );
        const data = (await res.json()) as RefetchDocsResult;

        if (data.error) {
          setError(data.error);
          break;
        }

        const batchProcessed = data.processed ?? 0;
        const batchDocs = data.docsFound ?? 0;
        const currentRemaining = data.remaining ?? 0;

        // Gesamtanzahl beim ersten Batch ermitteln
        if (initialTotal === 0 && batchProcessed > 0) {
          initialTotal = batchProcessed + currentRemaining;
          setTotalCount(initialTotal);
        }

        setTotalProcessed((p) => p + batchProcessed);
        setTotalDocsFound((d) => d + batchDocs);
        setRemaining(currentRemaining);

        if (batchProcessed === 0 || currentRemaining === 0) break;

        offset = data.nextOffset ?? offset + batchProcessed;

        // Pause zwischen Batches - ZVG-Portal Rate-Limiting
        await new Promise((r) => setTimeout(r, 1_500));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verbindungsfehler");
        break;
      }
    }

    setDone(true);
    setRunning(false);
  }, []);

  function reset() {
    setTotalProcessed(0);
    setTotalDocsFound(0);
    setTotalCount(0);
    setRemaining(null);
    setError(null);
    setDone(false);
  }

  const percent = totalCount > 0 ? Math.min(100, Math.round((totalProcessed / totalCount) * 100)) : 0;
  const showStats = running || done || !!error;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={running ? undefined : done ? reset : run}
          disabled={running}
          className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {running ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> PDF-Abruf läuft...</>
          ) : done ? (
            <><CheckCircle2 className="h-4 w-4" /> Erneut starten</>
          ) : (
            <><FileSearch className="h-4 w-4" /> PDF-Dokumente neu abrufen</>
          )}
        </button>
      </div>

      {showStats && (
        <div className={`rounded-xl px-4 py-4 text-sm ${
          error
            ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
            : done && !error
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
        }`}>
          {error ? (
            <span className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </span>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Statuszeile */}
              <span className="flex items-center gap-1.5 font-medium">
                {running
                  ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                {totalProcessed} Objekte geprüft
                {totalDocsFound > 0 && ` · ${totalDocsFound} PDF${totalDocsFound !== 1 ? "s" : ""} gefunden`}
                {remaining !== null && remaining > 0 && ` · noch ${remaining} ausstehend`}
                {remaining === 0 && done && " · alle fertig!"}
              </span>

              {/* Fortschrittsbalken */}
              {totalCount > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-900">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs opacity-70">
                    <span>{percent}%</span>
                    <span>{totalProcessed} / {totalCount}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
