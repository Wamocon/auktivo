import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify requester is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { userId: string; action: string; payload?: Record<string, unknown> };
  const { userId, action, payload } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
  }

  // Prevent self-demotion from admin
  if (userId === user.id && (action === "revoke_admin" || action === "downgrade_free" || action === "delete_user")) {
    return NextResponse.json({ error: "Eigenen Account nicht veränderbar" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (action) {
    case "promote_admin": {
      const { error } = await admin.from("profiles").update({ is_admin: true }).eq("id", userId);
      if (error) return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    case "revoke_admin": {
      const { error } = await admin.from("profiles").update({ is_admin: false }).eq("id", userId);
      if (error) return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    case "upgrade_pro": {
      const { error } = await admin.from("profiles").update({ plan: "pro" }).eq("id", userId);
      if (error) return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    case "downgrade_free": {
      const { error } = await admin.from("profiles").update({ plan: "free" }).eq("id", userId);
      if (error) return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    case "reset_search_count": {
      const { error } = await admin
        .from("profiles")
        .update({ monthly_search_count: 0, monthly_search_reset_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    case "edit_user": {
      if (!payload) return NextResponse.json({ error: "Keine Daten" }, { status: 400 });
      const allowed: Record<string, unknown> = {};
      if (typeof payload.full_name === "string") allowed.full_name = payload.full_name;
      if (typeof payload.company_name === "string") allowed.company_name = payload.company_name;
      if (payload.user_type === "private" || payload.user_type === "business") allowed.user_type = payload.user_type;
      if (payload.plan === "free" || payload.plan === "pro") allowed.plan = payload.plan;
      const { error } = await admin.from("profiles").update(allowed).eq("id", userId);
      if (error) return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    case "delete_user": {
      // Löscht den Auth-User (Cascade löscht das Profil)
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    default:
      return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  }
}
