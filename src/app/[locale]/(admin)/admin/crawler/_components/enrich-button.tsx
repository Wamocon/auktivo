"use client";

import { useState, useCallback } from "react";
import { Loader2, Layers, CheckCircle2, AlertTriangle } from "lucide-react";

interface EnrichResult {
  processed?: number;
  failed?: number;
  remaining?: number;
  error?: string;
}

export function EnrichButton() {
  const [running, setRunning] = useState(false);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const runBatch = useCallback(async () => {
    setRunning(true);
    setDone(false);
    setError(null);

    let currentRemaining = Infinity;

    while (currentRemaining > 0) {
      try {
        const res = await fetch("/api/admin/crawler/enrich", { method: "POST" });
        const data = (await res.json()) as EnrichResult;

        if (data.error) {
          setError(data.error);
          break;
        }

        const batchProcessed = data.processed ?? 0;
        const batchFailed = data.failed ?? 0;
        currentRemaining = data.remaining ?? 0;

        setTotalProcessed((p) => p + batchProcessed);
        setTotalFailed((f) => f + batchFailed);
        setRemaining(currentRemaining);

        // Nichts verarbeitet = alle fertig oder Fehler
        if (batchProcessed === 0 || currentRemaining === 0) break;

        // Kurze Pause zwischen Batches (Rate-Limiting ZVG-Portal)
        await new Promise((r) => setTimeout(r, 2_000));
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
    setTotalFailed(0);
    setRemaining(null);
    setError(null);
    setDone(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={running ? undefined : done ? reset : runBatch}
          disabled={running}
          className="flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
        >
          {running ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Anreicherung laeuft...</>
          ) : done ? (
            <><CheckCircle2 className="h-4 w-4" /> Erneut starten</>
          ) : (
            <><Layers className="h-4 w-4" /> Anreicherung starten</>
          )}
        </button>
        <p className="text-xs text-zinc-500">
          Laedt Detailseiten + Dokumente fuer unangereicherte Objekte (~30 pro Batch).
        </p>
      </div>

      {(running || done || error) && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          error
            ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
            : done && !error
              ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "bg-violet-50 text-violet-800 dark:bg-violet-900/20 dark:text-violet-300"
        }`}>
          {error ? (
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> {error}
            </span>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5">
                {running
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />}
                {totalProcessed} Objekte angereichert
                {totalFailed > 0 && ` (${totalFailed} fehlgeschlagen)`}
                {remaining !== null && remaining > 0 && ` - noch ${remaining} ausstehend`}
                {remaining === 0 && done && " - alle fertig!"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
