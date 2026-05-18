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
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setDone(false);
    setError(null);
    setTotalProcessed(0);
    setTotalDocsFound(0);
    setRemaining(null);

    let offset = 0;

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
    setRemaining(null);
    setError(null);
    setDone(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={running ? undefined : done ? reset : run}
          disabled={running}
          className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {running ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> PDF-Abruf l&auml;uft...</>
          ) : done ? (
            <><CheckCircle2 className="h-4 w-4" /> Erneut starten</>
          ) : (
            <><FileSearch className="h-4 w-4" /> PDF-Dokumente neu abrufen</>
          )}
        </button>
      </div>

      {(running || done || error) && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalProcessed}</p>
              <p className="text-xs text-zinc-500">Gepr&uuml;ft</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{totalDocsFound}</p>
              <p className="text-xs text-zinc-500">PDFs gefunden</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {remaining !== null ? remaining : "–"}
              </p>
              <p className="text-xs text-zinc-500">Verbleibend</p>
            </div>
          </div>

          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          {done && !error && (
            <p className="mt-3 text-center text-sm font-medium text-emerald-600">
              Fertig &mdash; {totalDocsFound} PDF{totalDocsFound !== 1 ? "s" : ""} bei {totalProcessed} Objekten gefunden.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
