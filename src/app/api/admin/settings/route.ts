import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings, updateAppSettings } from "@/lib/settings";
import type { AppSettings } from "@/lib/settings";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await getAppSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed: (keyof AppSettings)[] = [
    "maintenance_mode",
    "maintenance_message",
    "free_search_limit",
    "crawler_schedule",
    "crawler_rate_limit_ms",
    "crawler_auto_start",
    "crawler_max_properties",
    "crawler_active_states",
    "admin_notification_email",
    "error_webhook_url",
    "app_name",
    "support_email",
    "max_users",
    "registration_enabled",
    "pro_price_monthly",
  ];

  const updates: Partial<Record<keyof AppSettings, string>> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = String(body[key]);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid settings provided" }, { status: 400 });
  }

  const result = await updateAppSettings(updates, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
