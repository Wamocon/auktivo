"use client";

import { useEffect, useRef } from "react";
import { X, Download, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

interface PdfViewerModalProps {
  url: string;
  fileName: string;
  onClose: () => void;
}

export function PdfViewerModal({ url, fileName, onClose }: PdfViewerModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const proxyUrl = `/api/proxy/pdf?url=${encodeURIComponent(url)}`;

  // ESC-Taste schliessen
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Scroll sperren wenn Modal offen
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`PDF: ${fileName}`}
    >
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/60">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {fileName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={proxyUrl}
              download={fileName}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              title="Herunterladen"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              title="Im ZVG-Portal öffnen"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ZVG-Portal</span>
            </a>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-lg border border-zinc-300 bg-white p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              aria-label="Schliessen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* PDF iframe */}
        <div className="relative flex-1 bg-zinc-100 dark:bg-zinc-950">
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Dokument wird geladen...</p>
            </div>
          )}

          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
              <p className="max-w-sm text-xs text-zinc-500">
                Das Dokument konnte nicht im Viewer geladen werden. Bitte oeffnen Sie es direkt im ZVG-Portal.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
              >
                <ExternalLink className="h-4 w-4" /> Im ZVG-Portal öffnen
              </a>
            </div>
          ) : (
            <iframe
              src={proxyUrl}
              className="h-full w-full"
              title={fileName}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError("Das Dokument konnte nicht geladen werden.");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
