import { createAdminClient } from "@/lib/supabase/admin";

export type AppSettings = {
  maintenance_mode: boolean;
  maintenance_message: string;
  free_search_limit: number;
  crawler_schedule: string;
  crawler_rate_limit_ms: number;
  crawler_auto_start: boolean;
  crawler_max_properties: number;
  crawler_active_states: string;
  admin_notification_email: string;
  error_webhook_url: string;
  app_name: string;
  support_email: string;
  max_users: number;
  registration_enabled: boolean;
  pro_price_monthly: number;
};

const DEFAULTS: AppSettings = {
  maintenance_mode: false,
  maintenance_message:
    "Wir führen gerade Wartungsarbeiten durch. Bitte versuchen Sie es später erneut.",
  free_search_limit: 5,
  crawler_schedule: "0 6 * * *",
  crawler_rate_limit_ms: 2000,
  crawler_auto_start: false,
  crawler_max_properties: 10000,
  crawler_active_states: "all",
  admin_notification_email: "",
  error_webhook_url: "",
  app_name: "Auktivo",
  support_email: "",
  max_users: 0,
  registration_enabled: true,
  pro_price_monthly: 9.99,
};

function parseValue(key: keyof AppSettings, raw: string): AppSettings[keyof AppSettings] {
  const def = DEFAULTS[key];
  if (typeof def === "boolean") return raw === "true";
  if (typeof def === "number") {
    const n = parseFloat(raw);
    return isNaN(n) ? def : n;
  }
  return raw;
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("app_settings").select("key, value");
    if (error || !data) return { ...DEFAULTS };

    const settings = { ...DEFAULTS };
    for (const row of data) {
      const key = row.key as keyof AppSettings;
      if (key in DEFAULTS) {
        (settings as Record<string, unknown>)[key] = parseValue(key, row.value);
      }
    }
    return settings;
  } catch {
    return { ...DEFAULTS };
  }
}

export async function updateAppSetting(
  key: keyof AppSettings,
  value: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: userId });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function updateAppSettings(
  updates: Partial<Record<keyof AppSettings, string>>,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const rows = Object.entries(updates).map(([key, value]) => ({
      key,
      value: value ?? "",
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }));
    const { error } = await supabase.from("app_settings").upsert(rows);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
