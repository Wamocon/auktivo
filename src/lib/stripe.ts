import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  locale: string
): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card", "sepa_debit"],
    customer_email: email,
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/dashboard?upgrade=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/upgrade?canceled=true`,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
    locale: locale === "de" ? "de" : "en",
  });

  return session.url!;
}

export async function createCustomerPortalSession(
  stripeCustomerId: string,
  locale: string
): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/profil`,
  });

  return session.url;
}

