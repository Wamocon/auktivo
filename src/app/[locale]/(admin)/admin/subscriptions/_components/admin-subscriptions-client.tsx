"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, Crown, XCircle, CheckCircle2, MoreVertical } from "lucide-react";

interface SubRow {
  id: string;
  full_name: string | null;
  email: string | null;
  plan: string | null;
  subscription_status: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  monthly_search_count: number | null;
  created_at: string;
}

interface Props {
  subs: SubRow[];
}

function SubActions({ sub }: { sub: SubRow }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function doAction(action: string) {
    setLoading(true);
    setOpen(false);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: sub.id, action }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        alert(body.error ?? "Fehler");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        : (
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Weitere Aktionen"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        )
      }
      {open && (
        <div className="absolute right-0 top-8 z-20 min-w-48 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {sub.stripe_customer_id && (
            <a
              href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <ExternalLink className="h-4 w-4 text-zinc-500" /> Stripe-Dashboard
            </a>
          )}
          {sub.subscription_status !== "active" && (
            <button
              onClick={() => doAction("activate")}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Abo aktivieren
            </button>
          )}
          <hr className="my-1 border-zinc-100 dark:border-zinc-800" />
          <button
            onClick={() => { if (confirm("Abonnement wirklich kündigen? Der Nutzer wird auf Free zurückgesetzt.")) doAction("cancel"); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <XCircle className="h-4 w-4" /> Abo kündigen
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminSubscriptionsClient({ subs }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = subs.filter((s) => {
    const q = query.toLowerCase();
    const matchesQuery = !q || s.email?.toLowerCase().includes(q) || s.full_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || s.subscription_status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3 border-b border-zinc-200 p-4 dark:border-zinc-700">
        <input
          type="text"
          placeholder="Name oder E-Mail suchen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
        />
        <select
          aria-label="Status filtern"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        >
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="cancelled">Gekündigt</option>
          <option value="past_due">Überfällig</option>
        </select>
        <p className="text-xs text-zinc-400 shrink-0">{filtered.length} Ergebnisse</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-700 dark:bg-zinc-800/50">
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">E-Mail</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Stripe-Abo</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Suchen/Mo</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Seit</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-50">
                    <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    {s.full_name ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{s.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    s.subscription_status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : s.subscription_status === "past_due"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    {s.subscription_status === "active" ? "Aktiv"
                      : s.subscription_status === "cancelled" ? "Gekündigt"
                      : s.subscription_status === "past_due" ? "Überfällig"
                      : s.subscription_status ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {s.stripe_subscription_id
                    ? s.stripe_subscription_id.slice(0, 14) + "..."
                    : <span className="text-zinc-300">-</span>}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                  {s.monthly_search_count ?? 0}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {new Date(s.created_at).toLocaleDateString("de-DE")}
                </td>
                <td className="px-4 py-3">
                  <SubActions sub={s} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                  Keine Abonnements gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
