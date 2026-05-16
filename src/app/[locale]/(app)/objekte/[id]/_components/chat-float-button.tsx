"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, X, MessageSquare, Lock } from "lucide-react";

interface ChatFloatButtonProps {
  propertyId: string;
  locale: string;
  isPro: boolean;
}

export function ChatFloatButton({ propertyId, locale, isPro }: ChatFloatButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  function handleOpenChat() {
    if (!isPro) {
      router.push(`/${locale}/upgrade`);
      return;
    }
    router.push(`/${locale}/objekte/${propertyId}/chat`);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Tooltip-Karte beim Hover */}
      {expanded && (
        <div className="mb-1 w-56 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-1 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
            KI-Rechtsassistent
          </p>
          <p className="mb-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Stell Fragen zur Immobilie, zum Verfahren oder zum Bietprozess.
          </p>
          <button
            onClick={handleOpenChat}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            {isPro ? (
              <>
                <MessageSquare className="h-3.5 w-3.5" />
                Chat starten
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                Pro freischalten
              </>
            )}
          </button>
        </div>
      )}

      {/* Justizia-Schwebeschaltflache */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-label="KI-Assistent offnen"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-2xl ring-2 ring-white transition-transform hover:scale-105 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-800"
      >
        {expanded ? (
          <X className="h-6 w-6" />
        ) : (
          <Scale className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
