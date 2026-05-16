import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { userId: string; action: string };
  const { userId, action } = body;
  if (!userId || !action) return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });

  const admin = createAdminClient();

  switch (action) {
    case "cancel": {
      const { error } = await admin
        .from("profiles")
        .update({ plan: "free", subscription_status: "cancelled", stripe_subscription_id: null })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: "Database error" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    case "activate": {
      const { error } = await admin
        .from("profiles")
        .update({ plan: "pro", subscription_status: "active" })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: "Database error" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
