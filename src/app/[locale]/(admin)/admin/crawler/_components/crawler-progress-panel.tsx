"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MapPin,
  Building2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface CrawlerProgress {
  phase: "idle" | "running" | "completed" | "error";
  runId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  currentLand: string | null;
  processedLaender: number;
  totalLaender: number;
  processedProperties: number;
  insertedProperties: number;
  errors: number;
  lastError: string | null;
}

function formatDuration(startedAt: string | null, finishedAt?: string | null): string {
  if (!startedAt) return "-";
  const end = finishedAt ? new Date(finishedAt) : new Date();
  const secs = Math.floor((end.getTime() - new Date(startedAt).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function estimateRemaining(progress: CrawlerProgress): string {
  if (progress.phase !== "running" || !progress.startedAt || progress.processedLaender === 0) {
    return "-";
  }
  const elapsed = (Date.now() - new Date(progress.startedAt).getTime()) / 1000;
  const perLand = elapsed / progress.processedLaender;
  const remaining = perLand * (progress.totalLaender - progress.processedLaender);
  if (remaining < 60) return `~${Math.ceil(remaining)}s`;
  return `~${Math.ceil(remaining / 60)}m`;
}

export function CrawlerProgressPanel() {
  const [progress, setProgress] = useState<CrawlerProgress | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/admin/crawler/status");
      if (res.ok) {
        const data = (await res.json()) as CrawlerProgress;
        setProgress(data);
        // Polling-Intervall dynamisch anpassen
        const newInterval = data.phase === "running" ? 2000 : 10000;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(fetchStatus, newInterval);
        }
      }
    } catch {
      // Netzwerkfehler ignorieren
    }
  }

  useEffect(() => {
    fetchStatus();
    // Startet mit 2s, wird bei idle/completed auf 10s erhöht
    intervalRef.current = setInterval(fetchStatus, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart() {
    setIsStarting(true);
    setStartError(null);
    try {
      const res = await fetch("/api/admin/crawler/trigger", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setStartError(body.error ?? `Fehler ${res.status}`);
      } else {
        await fetchStatus();
      }
    } catch {
      setStartError("Netzwerkfehler");
    } finally {
      setIsStarting(false);
    }
  }

  const pct =
    progress && progress.totalLaender > 0
      ? Math.round((progress.processedLaender / progress.totalLaender) * 100)
      : 0;

  const isRunning = progress?.phase === "running";
  const isCompleted = progress?.phase === "completed";
  const isError = progress?.phase === "error";

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <RefreshCw className={`h-5 w-5 ${isRunning ? "animate-spin text-blue-600" : "text-zinc-500"}`} />
          Crawler
          {isRunning && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Läuft
            </span>
          )}
          {isCompleted && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
              Abgeschlossen
            </span>
          )}
          {isError && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
              Fehler
            </span>
          )}
        </h2>

        <button
          onClick={handleStart}
          disabled={isRunning || isStarting}
          className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isRunning ? "Läuft..." : "Jetzt starten"}
        </button>
      </div>

      {startError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {startError}
        </div>
      )}

      {progress && progress.phase !== "idle" && (
        <>
          {/* Fortschrittsbalken */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                {isRunning && progress.currentLand ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {progress.currentLand}
                  </span>
                ) : isCompleted ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" /> Fertig
                  </span>
                ) : isError ? (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-3 w-3" /> Fehlgeschlagen
                  </span>
                ) : (
                  "Bereit"
                )}
              </span>
              <span className="font-semibold tabular-nums">
                {progress.processedLaender} / {progress.totalLaender} Bundesländer ({pct}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              {/* Fortschrittsbalken mit CSS-Variable - kein inline style auf dem visuellen Element */}
              <div
                data-pct={pct}
                className={`h-full rounded-full transition-all duration-700 ${
                  isError ? "bg-red-500" : isCompleted ? "bg-green-500" : "bg-blue-500"
                }`}
                ref={(el) => { if (el) el.style.width = `${pct}%`; }}
              />
            </div>
          </div>

          {/* Statistik-Kacheln */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500">Gefunden</p>
              <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-zinc-50">
                {progress.processedProperties.toLocaleString("de-DE")}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500">Gespeichert</p>
              <p className="mt-0.5 flex items-center gap-1 text-xl font-bold tabular-nums text-green-600">
                <Building2 className="h-4 w-4" />
                {progress.insertedProperties.toLocaleString("de-DE")}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500">Laufzeit</p>
              <p className="mt-0.5 flex items-center gap-1 text-xl font-bold tabular-nums text-zinc-700 dark:text-zinc-300">
                <Clock className="h-4 w-4" />
                {formatDuration(progress.startedAt, progress.finishedAt)}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500">
                {isRunning ? "Restzeit" : "Fehler"}
              </p>
              <p
                className={`mt-0.5 text-xl font-bold tabular-nums ${
                  isRunning
                    ? "text-zinc-700 dark:text-zinc-300"
                    : progress.errors > 0
                    ? "text-red-600"
                    : "text-zinc-400"
                }`}
              >
                {isRunning ? estimateRemaining(progress) : progress.errors}
              </p>
            </div>
          </div>

          {progress.lastError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {progress.lastError}
            </div>
          )}
        </>
      )}

      {(!progress || progress.phase === "idle") && (
        <p className="text-sm text-zinc-500">
          Noch kein Crawler-Lauf seit Server-Start. Starte den Crawler manuell oder warte auf den täglichen automatischen Start um 06:00 Uhr UTC.
        </p>
      )}
    </div>
  );
}
