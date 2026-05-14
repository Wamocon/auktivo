"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Bell, BellOff } from "lucide-react";
import type { SearchAlert, PropertyType } from "@/lib/types/database";

interface AlertsClientProps {
  initialAlerts: SearchAlert[];
}

export function AlertsClient({ initialAlerts }: AlertsClientProps) {
  const t = useTranslations("alerts");
  const [alerts, setAlerts] = useState<SearchAlert[]>(initialAlerts);
  const [creating, setCreating] = useState(false);
  const [newZip, setNewZip] = useState("");
  const [newRadius, setNewRadius] = useState<number>(25);
  const [newEmail, setNewEmail] = useState(true);

  async function createAlert() {
    if (!newZip) return;

    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zip_codes: [newZip],
        radius_km: newRadius,
        notification_email: newEmail,
        notification_push: false,
        property_types: [] as PropertyType[],
        is_active: true,
      }),
    });

    if (res.ok) {
      const data = await res.json() as { alert: SearchAlert };
      setAlerts([data.alert, ...alerts]);
      setCreating(false);
      setNewZip("");
    }
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    setAlerts(alerts.filter((a) => a.id !== id));
  }

  async function toggleAlert(alert: SearchAlert) {
    const res = await fetch(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !alert.is_active }),
    });

    if (res.ok) {
      setAlerts(alerts.map((a) => a.id === alert.id ? { ...a, is_active: !a.is_active } : a));
    }
  }

  return (
    <div>
      {/* Create Form */}
      {creating ? (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800/50 dark:bg-brand-900/10">
          <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-50">{t("create")}</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("zip")}</label>
              <input
                type="text"
                value={newZip}
                onChange={(e) => setNewZip(e.target.value)}
                placeholder="12345"
                maxLength={5}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("radius")}</label>
              <select
                value={newRadius}
                onChange={(e) => setNewRadius(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {[10, 25, 50, 100].map((r) => <option key={r} value={r}>{r} km</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newEmail} onChange={(e) => setNewEmail(e.target.checked)} className="rounded" />
              {t("email_notifications")}
            </label>
            <div className="flex gap-3">
              <button onClick={createAlert} className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                Speichern
              </button>
              <button onClick={() => setCreating(false)} className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="mb-6 flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          <Plus className="h-4 w-4" /> {t("create")}
        </button>
      )}

      {/* Alert List */}
      {alerts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          {t("empty")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex-1">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  PLZ {alert.zip_codes.join(", ")} &middot; {alert.radius_km} km
                </p>
                <p className="text-xs text-zinc-500">
                  {alert.notification_email ? "E-Mail" : ""}{alert.notification_push ? ", Push" : ""}
                </p>
              </div>
              <button onClick={() => toggleAlert(alert)} className="text-zinc-400 hover:text-zinc-600">
                {alert.is_active ? <Bell className="h-4 w-4 text-brand-500" /> : <BellOff className="h-4 w-4" />}
              </button>
              <button onClick={() => deleteAlert(alert.id)} className="text-zinc-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
