import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, createCustomerPortalSession } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await request.json() as { action: "checkout" | "portal"; locale: string };

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, plan")
    .eq("id", user.id)
    .single();

  if (body.action === "portal") {
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "Kein Stripe-Konto" }, { status: 400 });
    }
    const url = await createCustomerPortalSession(profile.stripe_customer_id, body.locale ?? "de");
    return NextResponse.json({ url });
  }

  // Checkout
  const url = await createCheckoutSession(user.id, user.email!, body.locale ?? "de");
  return NextResponse.json({ url });
}
