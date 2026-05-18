"use client";

import { useState } from "react";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

interface OcrRerunResult {
  processed?: number;
  failed?: number;
  total?: number;
  message?: string;
  errors?: string[];
  error?: string;
}

export function OcrRerunButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OcrRerunResult | null>(null);

  async function handleRerun() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/ocr/rerun", { method: "POST" });
      const data = (await res.json()) as OcrRerunResult;
      setResult(data);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Verbindungsfehler" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={handleRerun}
          disabled={running}
          className="flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
        >
          {running ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> OCR wird ausgefuehrt...</>
          ) : (
            <><RefreshCw className="h-4 w-4" /> OCR erneut ausfuehren</>
          )}
        </button>
        <p className="text-xs text-zinc-500">
          Liest alle gespeicherten PDFs aus Supabase Storage und extrahiert den Text neu.
        </p>
      </div>

      {result && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          result.error
            ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
            : (result.processed ?? 0) > 0
              ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        }`}>
          {result.error ? (
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> {result.error}
            </span>
          ) : result.message ? (
            <span>{result.message}</span>
          ) : (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              {result.processed} von {result.total} Dokument(e) erfolgreich verarbeitet
              {(result.failed ?? 0) > 0 && ` (${result.failed} fehlgeschlagen)`}.
            </span>
          )}
          {result.errors && result.errors.length > 0 && (
            <ul className="mt-2 text-xs opacity-70">
              {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
