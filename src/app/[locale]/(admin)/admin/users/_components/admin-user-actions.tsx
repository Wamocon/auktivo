"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Shield, ShieldOff, Crown, TrendingDown,
  MoreVertical, Trash2, PenLine, Building2, User, RotateCcw,
} from "lucide-react";

interface AdminUserActionsProps {
  userId: string;
  currentPlan: "free" | "pro";
  isAdmin: boolean;
  currentUserId: string;
  userType: "private" | "business";
  fullName: string | null;
}

export function AdminUserActions({
  userId, currentPlan, isAdmin, currentUserId, userType, fullName,
}: AdminUserActionsProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [nameInput, setNameInput] = useState(fullName ?? "");
  const [showNameModal, setShowNameModal] = useState(false);
  const router = useRouter();
  const isSelf = userId === currentUserId;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleAction(action: string, value?: string) {
    setLoading(true);
    setOpen(false);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, value }),
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

  async function handleDelete() {
    if (!confirm("Nutzer wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    await handleAction("delete");
  }

  async function handleNameSave() {
    if (!nameInput.trim()) return;
    await handleAction("change_name", nameInput.trim());
    setShowNameModal(false);
  }

  return (
    <>
      <div className="relative flex items-center gap-1" ref={menuRef}>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}

        {/* Plan quick-toggle */}
        <button
          onClick={() => handleAction(currentPlan === "pro" ? "downgrade_free" : "upgrade_pro")}
          disabled={loading}
          title={currentPlan === "pro" ? "Auf Free downgraden" : "Auf Pro upgraden"}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          {currentPlan === "pro" ? <TrendingDown className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
        </button>

        {/* More actions dropdown */}
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={loading}
          title="Weitere Aktionen"
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {open && (
          <div className="absolute right-0 top-8 z-20 min-w-48 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {/* Admin toggle */}
            {!isSelf && (
              <button
                onClick={() => handleAction(isAdmin ? "revoke_admin" : "promote_admin")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                {isAdmin
                  ? <><ShieldOff className="h-4 w-4 text-zinc-500" /> Admin-Rechte entziehen</>
                  : <><Shield className="h-4 w-4 text-blue-500" /> Zum Admin machen</>}
              </button>
            )}

            {/* Change name */}
            <button
              onClick={() => { setShowNameModal(true); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <PenLine className="h-4 w-4 text-zinc-500" /> Name ändern
            </button>

            {/* Change user type */}
            <button
              onClick={() => handleAction("change_type", userType === "private" ? "business" : "private")}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              {userType === "private"
                ? <><Building2 className="h-4 w-4 text-zinc-500" /> Als Unternehmen markieren</>
                : <><User className="h-4 w-4 text-zinc-500" /> Als Privat markieren</>}
            </button>

            {/* Reset search counter */}
            <button
              onClick={() => handleAction("reset_searches")}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <RotateCcw className="h-4 w-4 text-zinc-500" /> Suchzähler zurücksetzen
            </button>

            {/* Delete */}
            {!isSelf && (
              <>
                <hr className="my-1 border-zinc-100 dark:border-zinc-800" />
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" /> Nutzer löschen
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Name-Edit Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">Name ändern</h3>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleNameSave(); }}
              aria-label="Neuer Name"
              placeholder="Vollständiger Name"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              autoFocus
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setShowNameModal(false)}
                className="rounded-full px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Abbrechen
              </button>
              <button
                onClick={handleNameSave}
                disabled={loading || !nameInput.trim()}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
