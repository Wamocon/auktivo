"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Zap, CreditCard, Loader2 } from "lucide-react";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";

interface UpgradeClientProps {
  locale: string;
  isPro: boolean;
}

export function UpgradeClient({ locale, isPro }: UpgradeClientProps) {
  const t = useTranslations("pricing");
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    const res = await fetch("/api/stripe/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkout", locale }),
    });
    const data = await res.json() as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
    }
  }

  const proFeatures = [
    t("pro_features.ai_analysis"),
    t("pro_features.ai_chat"),
    t("pro_features.favorites"),
    t("pro_features.alerts"),
    t("pro_features.unlimited_search"),
    t("pro_features.risk_filter"),
    t("pro_features.priority_support"),
  ];

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border-2 border-brand-500 bg-white p-8 shadow-lg dark:bg-zinc-900">
        {/* Badge */}
        <div className="mb-6 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            <Zap className="h-4 w-4" /> Pro-Plan
          </span>
        </div>

        {/* Price */}
        <div className="mb-8 text-center">
          <div className="text-5xl font-black text-zinc-900 dark:text-zinc-50">
            9,99 <span className="text-2xl font-medium">EUR</span>
          </div>
          <div className="mt-1 text-sm text-zinc-500">{t("per_month")}</div>
          <div className="mt-2 text-xs text-zinc-400">{t("cancel_anytime")}</div>
        </div>

        {/* Features */}
        <ul className="mb-8 flex flex-col gap-3">
          {proFeatures.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isPro ? (
          <div className="rounded-full bg-green-100 py-3 text-center text-sm font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
            Pro ist aktiv
          </div>
        ) : (
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {t("upgrade_now")}
          </button>
        )}

        <p className="mt-4 text-center text-xs text-zinc-400">
          Sicher bezahlen mit Stripe &middot; SEPA & Kreditkarte
        </p>
      </div>

      <div className="mt-6">
        <AiDisclaimer variant="short" />
      </div>
    </div>
  );
}
