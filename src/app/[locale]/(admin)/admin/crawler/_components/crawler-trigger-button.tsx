"use client";

import { useState } from "react";
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function CrawlerTriggerButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleTrigger() {
    setStatus("loading");
    try {
      const res = await fetch("/api/admin/crawler/trigger", { method: "POST" });
      if (res.ok) {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  const icons = {
    idle: RefreshCw,
    loading: Loader2,
    success: CheckCircle2,
    error: AlertCircle,
  };
  const Icon = icons[status];

  const styles = {
    idle: "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900",
    loading: "bg-zinc-900 text-white opacity-70 cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900",
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
  };

  const labels = {
    idle: "Crawler jetzt starten",
    loading: "Crawler wird gestartet...",
    success: "Crawler gestartet!",
    error: "Fehler - Erneut versuchen",
  };

  return (
    <button
      onClick={handleTrigger}
      disabled={status === "loading"}
      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${styles[status]}`}
    >
      <Icon className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
      {labels[status]}
    </button>
  );
}
