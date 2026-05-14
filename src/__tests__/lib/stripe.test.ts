import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted() stellt sicher dass Mocks vor dem Hoisting von vi.mock verfuegbar sind
const mockCheckoutCreate = vi.hoisted(() => vi.fn());
const mockBillingCreate = vi.hoisted(() => vi.fn());
const StripeMock = vi.hoisted(() =>
  vi.fn(function (this: Record<string, unknown>) {
    this.checkout = { sessions: { create: mockCheckoutCreate } };
    this.billingPortal = { sessions: { create: mockBillingCreate } };
    this.webhooks = { constructEvent: vi.fn() };
  })
);

vi.mock("stripe", () => ({ default: StripeMock }));

let stripeModule: typeof import("@/lib/stripe");

describe("getStripe", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    stripeModule = await import("@/lib/stripe");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("wirft Fehler wenn STRIPE_SECRET_KEY nicht gesetzt ist", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(() => stripeModule.getStripe()).toThrow("STRIPE_SECRET_KEY is not configured");
  });

  it("erstellt Stripe-Instanz wenn API-Key vorhanden", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_12345");
    const stripe = stripeModule.getStripe();
    expect(stripe).toBeDefined();
    expect(StripeMock).toHaveBeenCalledWith("sk_test_12345", expect.objectContaining({
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    }));
  });
});

describe("createCheckoutSession", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_12345");
    vi.stubEnv("STRIPE_PRO_PRICE_ID", "price_test_pro");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://auktivo.app");
    stripeModule = await import("@/lib/stripe");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("erstellt Checkout-Session und gibt URL zurueck", async () => {
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session123" });
    const url = await stripeModule.createCheckoutSession("user-123", "test@example.com", "de");
    expect(url).toBe("https://checkout.stripe.com/session123");
  });

  it("uebergibt User-ID als Metadata", async () => {
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/s" });
    await stripeModule.createCheckoutSession("user-xyz", "test@example.com", "de");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { userId: "user-xyz" } })
    );
  });

  it("setzt Locale de korrekt", async () => {
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/s" });
    await stripeModule.createCheckoutSession("u", "e@e.de", "de");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "de" })
    );
  });

  it("setzt Locale en fuer nicht-deutsche Sprachen", async () => {
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/s" });
    await stripeModule.createCheckoutSession("u", "e@e.de", "en");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en" })
    );
  });

  it("konfiguriert Abonnement-Modus", async () => {
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/s" });
    await stripeModule.createCheckoutSession("u", "e@e.de", "de");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        payment_method_types: expect.arrayContaining(["card", "sepa_debit"]),
      })
    );
  });

  it("setzt Erfolgs- und Abbruch-URL korrekt", async () => {
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/s" });
    await stripeModule.createCheckoutSession("u", "e@e.de", "de");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://auktivo.app/de/dashboard?upgrade=success",
        cancel_url: "https://auktivo.app/de/upgrade?canceled=true",
      })
    );
  });
});

describe("createCustomerPortalSession", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_12345");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://auktivo.app");
    stripeModule = await import("@/lib/stripe");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("erstellt Kundenportal-Session und gibt URL zurueck", async () => {
    mockBillingCreate.mockResolvedValue({ url: "https://billing.stripe.com/portal123" });
    const url = await stripeModule.createCustomerPortalSession("cus_test123", "de");
    expect(url).toBe("https://billing.stripe.com/portal123");
  });

  it("uebergibt Customer-ID korrekt", async () => {
    mockBillingCreate.mockResolvedValue({ url: "https://billing.stripe.com/p" });
    await stripeModule.createCustomerPortalSession("cus_abc456", "de");
    expect(mockBillingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_abc456" })
    );
  });

  it("setzt Return-URL korrekt", async () => {
    mockBillingCreate.mockResolvedValue({ url: "https://billing.stripe.com/p" });
    await stripeModule.createCustomerPortalSession("cus_test", "de");
    expect(mockBillingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ return_url: "https://auktivo.app/de/profil" })
    );
  });
});
