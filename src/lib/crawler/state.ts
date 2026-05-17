/**
 * In-memory Crawler Progress State (Singleton)
 * Wird von runner.ts geschrieben, von /api/admin/crawler/status gelesen.
 * Funktioniert nur im selben Node-Prozess (Next.js dev/prod ohne serverless).
 */

export interface CrawlerProgress {
  phase: "idle" | "running" | "paused" | "completed" | "error" | "aborted";
  controlSignal: "none" | "pause" | "abort";
  runId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  currentLand: string | null;
  /** Aktueller Schritt innerhalb eines Bundeslandes */
  currentStep: "scraping" | "saving" | "enriching" | null;
  /** Anzahl gefundener Objekte im aktuellen Bundesland */
  currentLandTotal: number;
  /** Anzahl bereits angereicherter Objekte im aktuellen Bundesland (Detail-Enrichment) */
  currentLandEnriched: number;
  processedLaender: number;
  totalLaender: number;
  processedProperties: number;
  insertedProperties: number;
  errors: number;
  lastError: string | null;
  lastErrorLand: string | null;
}

const initial: CrawlerProgress = {
  phase: "idle",
  controlSignal: "none",
  runId: null,
  startedAt: null,
  finishedAt: null,
  currentLand: null,
  currentStep: null,
  currentLandTotal: 0,
  currentLandEnriched: 0,
  processedLaender: 0,
  totalLaender: 16,
  processedProperties: 0,
  insertedProperties: 0,
  errors: 0,
  lastError: null,
  lastErrorLand: null,
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

export function sendControlSignal(signal: "pause" | "abort" | "none"): void {
  if (g._crawlerProgress) {
    g._crawlerProgress.controlSignal = signal;
  }
}
