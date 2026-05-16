"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Shield,
  Clock,
  Users,
  Bell,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
} from "lucide-react";
import type { AppSettings } from "@/lib/settings";

const BUNDESLAENDER = [
  "Bayern",
  "Baden-Württemberg",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
];

const CRON_PRESETS = [
  { label: "Täglich um 06:00 UTC", value: "0 6 * * *" },
  { label: "Täglich um 02:00 UTC", value: "0 2 * * *" },
  { label: "Täglich um 22:00 UTC", value: "0 22 * * *" },
  { label: "Zweimal täglich (06 + 18 UTC)", value: "0 6,18 * * *" },
  { label: "Wöchentlich Montag 06:00 UTC", value: "0 6 * * 1" },
  { label: "Benutzerdefiniert", value: "custom" },
];

type Props = {
  initialSettings: AppSettings;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function Toggle({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked ? "true" : "false"}
      aria-label={label}
      title={label}
      id={id}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
        checked ? "bg-brand-600" : "bg-zinc-200 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SectionCard({
  icon: Icon,
  iconColor,
  title,
  description,
  children,
  onSave,
  saveState,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  children: React.ReactNode;
  onSave: () => void;
  saveState: SaveState;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      </div>
      <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      <div className="space-y-4">{children}</div>
      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div className="flex h-5 items-center gap-1.5 text-sm">
          {saveState === "saved" && (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Gespeichert</span>
            </>
          )}
          {saveState === "error" && (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-600 dark:text-red-400">Fehler beim Speichern</span>
            </>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={saveState === "saving"}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saveState === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Speichern
        </button>
      </div>
    </section>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function AdminSettingsClient({ initialSettings }: Props) {
  const _t = useTranslations("admin");

  // -- General settings --
  const [appName, setAppName] = useState(initialSettings.app_name);
  const [supportEmail, setSupportEmail] = useState(initialSettings.support_email);
  const [generalSave, setGeneralSave] = useState<SaveState>("idle");

  // -- Maintenance --
  const [maintenanceMode, setMaintenanceMode] = useState(initialSettings.maintenance_mode);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    initialSettings.maintenance_message
  );
  const [maintenanceSave, setMaintenanceSave] = useState<SaveState>("idle");

  // -- Users & Limits --
  const [freeSearchLimit, setFreeSearchLimit] = useState(String(initialSettings.free_search_limit));
  const [maxUsers, setMaxUsers] = useState(String(initialSettings.max_users));
  const [registrationEnabled, setRegistrationEnabled] = useState(
    initialSettings.registration_enabled
  );
  const [proPriceMonthly, setProPriceMonthly] = useState(String(initialSettings.pro_price_monthly));
  const [limitsSave, setLimitsSave] = useState<SaveState>("idle");

  // -- Crawler --
  const [crawlerSchedule, setCrawlerSchedule] = useState(initialSettings.crawler_schedule);
  const [customCron, setCustomCron] = useState(
    CRON_PRESETS.some((p) => p.value === initialSettings.crawler_schedule)
      ? ""
      : initialSettings.crawler_schedule
  );
  const [crawlerRateLimit, setCrawlerRateLimit] = useState(
    String(initialSettings.crawler_rate_limit_ms)
  );
  const [crawlerAutoStart, setCrawlerAutoStart] = useState(initialSettings.crawler_auto_start);
  const [crawlerMaxProps, setCrawlerMaxProps] = useState(
    String(initialSettings.crawler_max_properties)
  );
  const [activeStates, setActiveStates] = useState<string[]>(
    initialSettings.crawler_active_states === "all"
      ? ["all"]
      : initialSettings.crawler_active_states.split(",").map((s) => s.trim())
  );
  const [crawlerSave, setCrawlerSave] = useState<SaveState>("idle");

  // -- Notifications --
  const [adminEmail, setAdminEmail] = useState(initialSettings.admin_notification_email);
  const [webhookUrl, setWebhookUrl] = useState(initialSettings.error_webhook_url);
  const [notificationsSave, setNotificationsSave] = useState<SaveState>("idle");

  const [, startTransition] = useTransition();

  async function saveSection(
    data: Partial<Record<string, string>>,
    setstate: (s: SaveState) => void
  ) {
    setstate("saving");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        setstate("error");
        setTimeout(() => setstate("idle"), 3000);
        return;
      }
      setstate("saved");
      setTimeout(() => setstate("idle"), 2500);
    } catch {
      setstate("error");
      setTimeout(() => setstate("idle"), 3000);
    }
  }

  function toggleState(state: string) {
    if (state === "all") {
      setActiveStates(["all"]);
      return;
    }
    setActiveStates((prev) => {
      const withoutAll = prev.filter((s) => s !== "all");
      if (withoutAll.includes(state)) {
        const next = withoutAll.filter((s) => s !== state);
        return next.length === 0 ? ["all"] : next;
      }
      return [...withoutAll, state];
    });
  }

  const effectiveCron = crawlerSchedule === "custom" ? customCron : crawlerSchedule;

  return (
    <div className="space-y-6">
      {/* General */}
      <SectionCard
        icon={Globe}
        iconColor="text-blue-500"
        title="Allgemein"
        description="App-Name, Support-E-Mail und grundlegende Einstellungen."
        onSave={() =>
          startTransition(() =>
            saveSection(
              { app_name: appName, support_email: supportEmail },
              setGeneralSave
            )
          )
        }
        saveState={generalSave}
      >
        <SettingRow label="App-Name" description="Wird in E-Mails und im UI angezeigt.">
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            aria-label="App-Name"
            title="App-Name"
            className="w-40 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </SettingRow>
        <SettingRow
          label="Support-E-Mail"
          description="E-Mail-Adresse die Nutzern für Support angezeigt wird."
        >
          <input
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            placeholder="support@example.com"
            aria-label="Support-E-Mail-Adresse"
            title="Support-E-Mail-Adresse"
            className="w-52 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </SettingRow>
      </SectionCard>

      {/* Maintenance */}
      <SectionCard
        icon={Shield}
        iconColor="text-amber-500"
        title="Wartungsmodus"
        description="Sperrt alle Nicht-Admins aus. Zeigt eine Wartungsseite an."
        onSave={() =>
          startTransition(() =>
            saveSection(
              {
                maintenance_mode: String(maintenanceMode),
                maintenance_message: maintenanceMessage,
              },
              setMaintenanceSave
            )
          )
        }
        saveState={maintenanceSave}
      >
        <SettingRow
          label="Wartungsmodus aktiv"
          description="Nicht-Admins werden zur Wartungsseite weitergeleitet."
        >
          <div className="flex items-center gap-2">
            <Toggle
              id="maintenance_mode"
              label="Wartungsmodus aktiv"
              checked={maintenanceMode}
              onChange={setMaintenanceMode}
            />
            <span
              className={`text-xs font-medium ${
                maintenanceMode
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {maintenanceMode ? "Aktiv" : "Inaktiv"}
            </span>
          </div>
        </SettingRow>
        <div className="space-y-1.5">
          <label
            htmlFor="maintenance_message"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Wartungshinweis (wird Nutzern angezeigt)
          </label>
          <textarea
            id="maintenance_message"
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            rows={3}
            aria-label="Wartungshinweis"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </SectionCard>

      {/* Users & Limits */}
      <SectionCard
        icon={Users}
        iconColor="text-indigo-500"
        title="Nutzer & Limits"
        description="Suchlimits, Registrierung und Plan-Einstellungen."
        onSave={() =>
          startTransition(() =>
            saveSection(
              {
                free_search_limit: freeSearchLimit,
                max_users: maxUsers,
                registration_enabled: String(registrationEnabled),
                pro_price_monthly: proPriceMonthly,
              },
              setLimitsSave
            )
          )
        }
        saveState={limitsSave}
      >
        <SettingRow
          label="Neue Registrierungen"
          description="Erlaubt neuen Nutzern, sich zu registrieren."
        >
          <div className="flex items-center gap-2">
            <Toggle
              id="registration_enabled"
              label="Neue Registrierungen"
              checked={registrationEnabled}
              onChange={setRegistrationEnabled}
            />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {registrationEnabled ? "Erlaubt" : "Gesperrt"}
            </span>
          </div>
        </SettingRow>
        <SettingRow
          label="Suchlimit Free-Plan (pro Monat)"
          description="Maximale Suchanfragen für kostenlose Accounts."
        >
          <input
            type="number"
            min={1}
            max={1000}
            value={freeSearchLimit}
            onChange={(e) => setFreeSearchLimit(e.target.value)}
            aria-label="Suchlimit Free-Plan pro Monat"
            title="Suchlimit Free-Plan pro Monat"
            className="w-20 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-center text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </SettingRow>
        <SettingRow
          label="Maximale Nutzeranzahl"
          description="0 = unbegrenzt. Bei Erreichen des Limits werden neue Registrierungen gesperrt."
        >
          <input
            type="number"
            min={0}
            value={maxUsers}
            onChange={(e) => setMaxUsers(e.target.value)}
            aria-label="Maximale Nutzeranzahl"
            title="Maximale Nutzeranzahl"
            className="w-24 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-center text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </SettingRow>
        <SettingRow
          label="Pro-Plan Preis (EUR/Monat)"
          description="Nur für die Anzeige. Preisänderungen müssen in Stripe vorgenommen werden."
        >
          <div className="flex items-center gap-1">
            <span className="text-sm text-zinc-500">€</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={proPriceMonthly}
              onChange={(e) => setProPriceMonthly(e.target.value)}
              aria-label="Pro-Plan Preis in EUR pro Monat"
              title="Pro-Plan Preis in EUR pro Monat"
              className="w-20 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-center text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
        </SettingRow>
      </SectionCard>

      {/* Crawler */}
      <SectionCard
        icon={Clock}
        iconColor="text-brand-500"
        title="Crawler-Einstellungen"
        description="Zeitplan, Geschwindigkeit und welche Bundesländer gecrawlt werden."
        onSave={() =>
          startTransition(() =>
            saveSection(
              {
                crawler_schedule: effectiveCron,
                crawler_rate_limit_ms: crawlerRateLimit,
                crawler_auto_start: String(crawlerAutoStart),
                crawler_max_properties: crawlerMaxProps,
                crawler_active_states:
                  activeStates.includes("all") ? "all" : activeStates.join(","),
              },
              setCrawlerSave
            )
          )
        }
        saveState={crawlerSave}
      >
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Zeitplan (Cron)
          </label>
          <div className="flex flex-wrap gap-2">
            {CRON_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setCrawlerSchedule(preset.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  crawlerSchedule === preset.value
                    ? "bg-brand-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {crawlerSchedule === "custom" && (
            <input
              type="text"
              value={customCron}
              onChange={(e) => setCustomCron(e.target.value)}
              placeholder="z.B. 0 6 * * 1-5"
              aria-label="Benutzerdefinierter Cron-Ausdruck"
              title="Benutzerdefinierter Cron-Ausdruck"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            />
          )}
          {crawlerSchedule !== "custom" && (
            <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
              Cron-Ausdruck: <span className="text-zinc-600 dark:text-zinc-300">{crawlerSchedule}</span>
            </p>
          )}
        </div>
        <SettingRow
          label="Rate-Limit (ms zwischen Requests)"
          description="Wartezeit in Millisekunden zwischen Anfragen an Quellen."
        >
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={500}
              max={30000}
              step={500}
              value={crawlerRateLimit}
              onChange={(e) => setCrawlerRateLimit(e.target.value)}
              aria-label="Rate-Limit in Millisekunden"
              title="Rate-Limit in Millisekunden"
              className="w-24 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-center font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <span className="text-xs text-zinc-400">ms</span>
          </div>
        </SettingRow>
        <SettingRow
          label="Max. Objekte pro Lauf"
          description="Crawler stoppt wenn dieses Limit erreicht wird (0 = unbegrenzt)."
        >
          <input
            type="number"
            min={0}
            step={1000}
            value={crawlerMaxProps}
            onChange={(e) => setCrawlerMaxProps(e.target.value)}
            aria-label="Maximale Objekte pro Crawler-Lauf"
            title="Maximale Objekte pro Crawler-Lauf"
            className="w-24 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-center font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </SettingRow>
        <SettingRow
          label="Auto-Start bei Server-Boot"
          description="Startet den Crawler automatisch wenn der Server neu gestartet wird."
        >
          <div className="flex items-center gap-2">
            <Toggle
              id="crawler_auto_start"
              label="Auto-Start bei Server-Boot"
              checked={crawlerAutoStart}
              onChange={setCrawlerAutoStart}
            />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {crawlerAutoStart ? "Aktiv" : "Inaktiv"}
            </span>
          </div>
        </SettingRow>

        {/* Bundesländer */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Aktive Bundesländer
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveStates(["all"])}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeStates.includes("all")
                  ? "bg-brand-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              Alle
            </button>
            {BUNDESLAENDER.map((land) => (
              <button
                key={land}
                onClick={() => toggleState(land)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeStates.includes("all") || activeStates.includes(land)
                    ? "bg-brand-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {land}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {activeStates.includes("all")
              ? "Alle 16 Bundesländer werden gecrawlt."
              : `${activeStates.length} Bundesland/Bundesländer ausgewählt: ${activeStates.join(", ")}`}
          </p>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        icon={Bell}
        iconColor="text-violet-500"
        title="Benachrichtigungen"
        description="E-Mail und Webhook-Benachrichtigungen bei Fehlern und Ereignissen."
        onSave={() =>
          startTransition(() =>
            saveSection(
              {
                admin_notification_email: adminEmail,
                error_webhook_url: webhookUrl,
              },
              setNotificationsSave
            )
          )
        }
        saveState={notificationsSave}
      >
        <SettingRow
          label="Admin-Benachrichtigungs-E-Mail"
          description="Bekommt E-Mails bei Crawler-Fehlern und kritischen Ereignissen."
        >
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="admin@example.com"
            aria-label="Admin-Benachrichtigungs-E-Mail-Adresse"
            title="Admin-Benachrichtigungs-E-Mail-Adresse"
            className="w-52 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </SettingRow>
        <div className="space-y-1.5">
          <label
            htmlFor="error_webhook_url"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Slack/Discord Webhook URL
          </label>
          <input
            id="error_webhook_url"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/..."
            aria-label="Slack oder Discord Webhook URL"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Leer lassen um Webhook zu deaktivieren.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
