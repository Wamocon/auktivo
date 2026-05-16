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

  const body = await request.json() as { userId: string; action: string; value?: string };
  const { userId, action, value } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
  }

  // Prevent self-modification of critical fields
  if (userId === user.id && (action === "revoke_admin" || action === "downgrade_free" || action === "delete")) {
    return NextResponse.json({ error: "Cannot modify own account this way" }, { status: 400 });
  }

  const admin = createAdminClient();
  let updateData: Record<string, unknown> = {};

  switch (action) {
    case "promote_admin":
      updateData = { is_admin: true };
      break;
    case "revoke_admin":
      updateData = { is_admin: false };
      break;
    case "upgrade_pro":
      updateData = { plan: "pro", subscription_status: "active" };
      break;
    case "downgrade_free":
      updateData = { plan: "free", subscription_status: "cancelled" };
      break;
    case "change_name":
      if (!value?.trim()) return NextResponse.json({ error: "Name darf nicht leer sein" }, { status: 400 });
      updateData = { full_name: value.trim() };
      break;
    case "change_type":
      if (value !== "private" && value !== "business") return NextResponse.json({ error: "Ungültiger Typ" }, { status: 400 });
      updateData = { user_type: value };
      break;
    case "reset_searches":
      updateData = { monthly_search_count: 0 };
      break;
    case "delete": {
      // Delete from auth (cascades to profiles via FK)
      const { error: authErr } = await admin.auth.admin.deleteUser(userId);
      if (authErr) return NextResponse.json({ error: "Auth-Löschung fehlgeschlagen" }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { error } = await admin
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    console.error("[Admin/Users API] Update error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
