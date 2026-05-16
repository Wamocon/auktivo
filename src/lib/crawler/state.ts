/**
 * In-memory Crawler Progress State (Singleton)
 * Wird von runner.ts geschrieben, von /api/admin/crawler/status gelesen.
 * Funktioniert nur im selben Node-Prozess (Next.js dev/prod ohne serverless).
 */

export interface CrawlerProgress {
  phase: "idle" | "running" | "paused" | "completed" | "error";
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
  cancelRequested: boolean;
  pauseRequested: boolean;
}

const initial: CrawlerProgress = {
  phase: "idle",
  runId: null,
  startedAt: null,
  finishedAt: null,
  currentLand: null,
  processedLaender: 0,
  totalLaender: 16,
  processedProperties: 0,
  insertedProperties: 0,
  errors: 0,
  lastError: null,
  cancelRequested: false,
  pauseRequested: false,
};

// Globales Singleton - überlebt zwischen Requests im selben Prozess
const g = globalThis as typeof globalThis & { _crawlerProgress?: CrawlerProgress };
if (!g._crawlerProgress) {
  g._crawlerProgress = { ...initial };
}

export function getCrawlerProgress(): CrawlerProgress {
  return { ...g._crawlerProgress! };
}

export function setCrawlerProgress(patch: Partial<CrawlerProgress>): void {
  Object.assign(g._crawlerProgress!, patch);
}

export function resetCrawlerProgress(): void {
  g._crawlerProgress = { ...initial };
}

export function requestCancel(): void {
  if (g._crawlerProgress) g._crawlerProgress.cancelRequested = true;
}

export function requestPause(): void {
  if (g._crawlerProgress) {
    g._crawlerProgress.pauseRequested = true;
    g._crawlerProgress.phase = "paused";
  }
}

export function requestResume(): void {
  if (g._crawlerProgress) {
    g._crawlerProgress.pauseRequested = false;
    g._crawlerProgress.phase = "running";
  }
}
