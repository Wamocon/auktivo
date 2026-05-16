import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    full_name?: string;
    phone?: string;
    company_name?: string;
    user_type?: "private" | "business";
    email_notifications?: boolean;
  };

  // Validate user_type
  if (body.user_type && !["private", "business"].includes(body.user_type)) {
    return NextResponse.json({ error: "Invalid user_type" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.full_name !== undefined) updateData.full_name = body.full_name.trim() || null;
  if (body.phone !== undefined) updateData.phone = body.phone.trim() || null;
  if (body.company_name !== undefined) updateData.company_name = body.company_name.trim() || null;
  if (body.user_type !== undefined) updateData.user_type = body.user_type;
  if (body.email_notifications !== undefined) updateData.email_notifications = body.email_notifications;

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    console.error("[Profile API] Update error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
