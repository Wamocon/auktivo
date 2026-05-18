"use client";

import { useState } from "react";
import { Search, Crown, Shield, Building2, User, ChevronDown } from "lucide-react";
import { AdminUserActions } from "./admin-user-actions";

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  plan: string | null;
  user_type: string | null;
  is_admin: boolean | null;
  company_name: string | null;
  monthly_search_count: number | null;
  subscription_status: string | null;
  created_at: string;
}

interface Props {
  users: UserRow[];
  currentUserId: string;
  adminCount: number;
}

type PlanFilter = "all" | "pro" | "free";
type TypeFilter = "all" | "private" | "business";

export function AdminUsersClient({ users, currentUserId }: Props) {
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const filtered = users.filter((u) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.company_name?.toLowerCase().includes(q);
    const matchesPlan = planFilter === "all" || u.plan === planFilter;
    const matchesType = typeFilter === "all" || u.user_type === typeFilter;
    return matchesQuery && matchesPlan && matchesType;
  });

  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 p-4 dark:border-zinc-700">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Name, E-Mail oder Firma suchen..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              aria-label="Plan filtern"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
              className="appearance-none rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-3 pr-7 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              <option value="all">Alle Pläne</option>
              <option value="pro">Pro</option>
              <option value="free">Free</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          </div>
          <div className="relative">
            <select
              aria-label="Typ filtern"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="appearance-none rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-3 pr-7 text-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              <option value="all">Alle Typen</option>
              <option value="private">Privat</option>
              <option value="business">Unternehmen</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>
        <p className="ml-auto text-xs text-zinc-400">{filtered.length} Ergebnisse</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-700 dark:bg-zinc-800/50">
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">E-Mail</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Plan</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Typ</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Suchen/Mo</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Registriert</th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.is_admin && <Shield className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {u.full_name ?? "-"}
                    </span>
                    {u.is_admin && (
                      <span className="rounded bg-red-100 px-1 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        Admin
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    u.plan === "pro"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    {u.plan === "pro" && <Crown className="h-3 w-3" />}
                    {u.plan === "pro" ? "Pro" : "Free"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                    {u.user_type === "business" ? (
                      <><Building2 className="h-3.5 w-3.5" /> {u.company_name ?? "Unternehmen"}</>
                    ) : (
                      <><User className="h-3.5 w-3.5" /> Privat</>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                  {u.monthly_search_count ?? 0}
                  {u.plan !== "pro" && (
                    <span className="ml-1 text-zinc-400">/ 5</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {new Date(u.created_at).toLocaleDateString("de-DE")}
                </td>
                <td className="px-4 py-3">
                  <AdminUserActions
                    userId={u.id}
                    currentPlan={(u.plan ?? "free") as "free" | "pro"}
                    isAdmin={u.is_admin ?? false}
                    currentUserId={currentUserId}
                    userType={(u.user_type ?? "private") as "private" | "business"}
                    fullName={u.full_name}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                  Keine Nutzer gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
