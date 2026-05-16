"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle, CheckCircle2, ExternalLink } from "lucide-react";

interface AdminSubscriptionActionsProps {
  userId: string;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  plan: string;
}

export function AdminSubscriptionActions({
  userId, stripeCustomerId, subscriptionStatus, plan,
}: AdminSubscriptionActionsProps) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  async function handleAction(action: string) {
    setLoading(true);
    setConfirm(false);
    try {
      await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}

      {/* Stripe-Link */}
      {stripeCustomerId && (
        <a
          href={`https://dashboard.stripe.com/customers/${stripeCustomerId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded p-1 text-zinc-400 hover:text-blue-600"
          title="In Stripe öffnen"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {/* Cancel / Reaktivieren */}
      {plan === "pro" && subscriptionStatus !== "cancelled" && (
        confirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleAction("cancel_subscription")}
              disabled={loading}
              className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle className="h-3 w-3" /> Ja
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="rounded border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700"
            >
              Nein
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            disabled={loading}
            title="Abonnement kündigen"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <XCircle className="h-3 w-3" /> Kündigen
          </button>
        )
      )}

      {/* Reaktivieren */}
      {(plan === "free" || subscriptionStatus === "cancelled") && (
        <button
          onClick={() => handleAction("activate_subscription")}
          disabled={loading}
          title="Pro manuell aktivieren"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-40 dark:text-green-400 dark:hover:bg-green-950/30"
        >
          <CheckCircle2 className="h-3 w-3" /> Aktivieren
        </button>
      )}
    </div>
  );
}
