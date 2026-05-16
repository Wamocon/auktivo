"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Shield, ShieldOff, Crown, TrendingDown,
  MoreHorizontal, RefreshCw, Pencil, Trash2, X, Check, Building2, User,
} from "lucide-react";

interface AdminUserActionsProps {
  userId: string;
  currentPlan: "free" | "pro";
  isAdmin: boolean;
  currentUserId: string;
  fullName: string | null;
  companyName: string | null;
  userType: "private" | "business";
  monthlySearchCount: number;
}

export function AdminUserActions({
  userId, currentPlan, isAdmin, currentUserId,
  fullName, companyName, userType, monthlySearchCount,
}: AdminUserActionsProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(fullName ?? "");
  const [editCompany, setEditCompany] = useState(companyName ?? "");
  const [editType, setEditType] = useState<"private" | "business">(userType);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isSelf = userId === currentUserId;

  // Schließen bei Klick außerhalb
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setDeleteConfirm(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleAction(action: string, payload?: Record<string, unknown>) {
    setLoading(true);
    setOpen(false);
    try {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, payload }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit() {
    await handleAction("edit_user", {
      full_name: editName,
      company_name: editCompany,
      user_type: editType,
    });
    setEditOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Nutzer bearbeiten</h3>
              <button onClick={() => setEditOpen(false)} className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="edit-name" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Name</label>
                <input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
              <div>
                <label htmlFor="edit-type" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Nutzertyp</label>
                <select
                  id="edit-type"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as "private" | "business")}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                >
                  <option value="private">Privat</option>
                  <option value="business">Geschäftlich</option>
                </select>
              </div>
              {editType === "business" && (
                <div>
                  <label htmlFor="edit-company" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Firmenname</label>
                  <input
                    id="edit-company"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  />
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={handleEdit}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Speichern
              </button>
              <button onClick={() => setEditOpen(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        title="Aktionen"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {/* Edit */}
          <button
            onClick={() => { setOpen(false); setEditOpen(true); }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Pencil className="h-3.5 w-3.5 text-zinc-400" />
            Bearbeiten
          </button>

          {/* Plan Toggle */}
          <button
            onClick={() => handleAction(currentPlan === "pro" ? "downgrade_free" : "upgrade_pro")}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {currentPlan === "pro"
              ? <TrendingDown className="h-3.5 w-3.5 text-zinc-400" />
              : <Crown className="h-3.5 w-3.5 text-amber-500" />}
            {currentPlan === "pro" ? "Auf Free downgraden" : "Auf Pro upgraden"}
          </button>

          {/* Admin Toggle */}
          {!isSelf && (
            <button
              onClick={() => handleAction(isAdmin ? "revoke_admin" : "promote_admin")}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {isAdmin
                ? <ShieldOff className="h-3.5 w-3.5 text-zinc-400" />
                : <Shield className="h-3.5 w-3.5 text-blue-500" />}
              {isAdmin ? "Admin-Rechte entziehen" : "Zum Admin machen"}
            </button>
          )}

          {/* Reset Search Count */}
          <button
            onClick={() => handleAction("reset_search_count")}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
            Suchen zurücksetzen
            <span className="ml-auto text-xs text-zinc-400">({monthlySearchCount})</span>
          </button>

          {/* Divider + Delete */}
          {!isSelf && (
            <>
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              {deleteConfirm ? (
                <div className="px-4 py-2">
                  <p className="mb-2 text-xs text-red-600 dark:text-red-400">Wirklich löschen?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction("delete_user")}
                      className="flex flex-1 items-center justify-center gap-1 rounded bg-red-600 py-1 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      <Trash2 className="h-3 w-3" /> Ja, löschen
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="flex items-center justify-center rounded border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Nutzer löschen
                </button>
              )}
            </>
          )}

          {/* User type indicator */}
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-400">
            {userType === "business" ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
            {userType === "business" ? "Business-Konto" : "Privatkonto"}
          </div>
        </div>
      )}
    </div>
  );
}
