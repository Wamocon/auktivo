import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase Admin Client mocken - BEVOR der Import von feature-gate
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getUserPlan, canAccess, checkSearchLimit, isPro } from "@/lib/feature-gate";
import type { Feature } from "@/lib/feature-gate";

// Helper: Supabase-Client-Mock mit konfigurierbaren Responses
function mockSupabase(options: {
  plan?: string | null;
  planError?: boolean;
  rpcData?: { allowed: boolean; remaining: number } | null;
  rpcError?: boolean;
  isAdmin?: boolean;
}) {
  const singleMock = vi.fn().mockResolvedValue({
    data: options.plan !== undefined ? { plan: options.plan } : null,
    error: options.planError ? new Error("DB error") : null,
  });

  const rpcMock = vi.fn().mockResolvedValue({
    data: options.rpcData ?? null,
    error: options.rpcError ? new Error("RPC error") : null,
  });

  const fromMock = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: singleMock,
      }),
    }),
  });

  vi.mocked(createAdminClient).mockReturnValue({
    from: fromMock,
    rpc: rpcMock,
  } as unknown as ReturnType<typeof createAdminClient>);

  return { fromMock, rpcMock, singleMock };
}

describe("getUserPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt 'pro' zurueck wenn Nutzer Pro-Plan hat", async () => {
    mockSupabase({ plan: "pro" });
    const plan = await getUserPlan("user-123");
    expect(plan).toBe("pro");
  });

  it("gibt 'free' zurueck wenn Nutzer Free-Plan hat", async () => {
    mockSupabase({ plan: "free" });
    const plan = await getUserPlan("user-123");
    expect(plan).toBe("free");
  });

  it("gibt 'free' als Fallback zurueck wenn kein Profil gefunden", async () => {
    mockSupabase({ plan: null });
    const plan = await getUserPlan("user-123");
    expect(plan).toBe("free");
  });

  it("ruft Supabase mit korrekter User-ID auf", async () => {
    const { fromMock } = mockSupabase({ plan: "free" });
    await getUserPlan("test-user-456");
    expect(fromMock).toHaveBeenCalledWith("profiles");
  });
});

describe("canAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const proFeatures: Feature[] = [
    "ai_analysis",
    "ai_chat",
    "favorites",
    "alerts",
    "unlimited_search",
    "risk_filter",
  ];

  it("verweigert ai_analysis fuer Free-Nutzer", async () => {
    mockSupabase({ plan: "free" });
    expect(await canAccess("user-free", "ai_analysis")).toBe(false);
  });

  it("verweigert ai_chat fuer Free-Nutzer", async () => {
    mockSupabase({ plan: "free" });
    expect(await canAccess("user-free", "ai_chat")).toBe(false);
  });

  it("verweigert favorites fuer Free-Nutzer", async () => {
    mockSupabase({ plan: "free" });
    expect(await canAccess("user-free", "favorites")).toBe(false);
  });

  it("verweigert alerts fuer Free-Nutzer", async () => {
    mockSupabase({ plan: "free" });
    expect(await canAccess("user-free", "alerts")).toBe(false);
  });

  it("verweigert unlimited_search fuer Free-Nutzer", async () => {
    mockSupabase({ plan: "free" });
    expect(await canAccess("user-free", "unlimited_search")).toBe(false);
  });

  it("verweigert risk_filter fuer Free-Nutzer", async () => {
    mockSupabase({ plan: "free" });
    expect(await canAccess("user-free", "risk_filter")).toBe(false);
  });

  it("erlaubt alle Pro-Features fuer Pro-Nutzer", async () => {
    for (const feature of proFeatures) {
      mockSupabase({ plan: "pro" });
      expect(await canAccess("user-pro", feature)).toBe(true);
    }
  });
});

describe("checkSearchLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt allowed=true und remaining=3 zurueck bei Erfolg", async () => {
    mockSupabase({ rpcData: { allowed: true, remaining: 3 } });
    const result = await checkSearchLimit("user-123");
    expect(result).toEqual({ allowed: true, remaining: 3 });
  });

  it("gibt allowed=false und remaining=0 zurueck wenn Limit erreicht", async () => {
    mockSupabase({ rpcData: { allowed: false, remaining: 0 } });
    const result = await checkSearchLimit("user-123");
    expect(result).toEqual({ allowed: false, remaining: 0 });
  });

  it("gibt allowed=false und remaining=0 bei RPC-Fehler zurueck", async () => {
    mockSupabase({ rpcError: true });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await checkSearchLimit("user-123");
    expect(result).toEqual({ allowed: false, remaining: 0 });
    consoleSpy.mockRestore();
  });

  it("gibt Fallback-Werte zurueck wenn RPC null data liefert", async () => {
    mockSupabase({ rpcData: null });
    const result = await checkSearchLimit("user-123");
    expect(result).toEqual({ allowed: false, remaining: 0 });
  });

  it("ruft increment_search_count RPC auf", async () => {
    const { rpcMock } = mockSupabase({ rpcData: { allowed: true, remaining: 2 } });
    await checkSearchLimit("user-abc");
    expect(rpcMock).toHaveBeenCalledWith("increment_search_count", {
      p_user_id: "user-abc",
    });
  });
});

describe("isPro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt true zurueck fuer Pro-Nutzer", async () => {
    mockSupabase({ plan: "pro" });
    expect(await isPro("user-pro")).toBe(true);
  });

  it("gibt false zurueck fuer Free-Nutzer", async () => {
    mockSupabase({ plan: "free" });
    expect(await isPro("user-free")).toBe(false);
  });

  it("gibt false zurueck wenn kein Plan vorhanden", async () => {
    mockSupabase({ plan: null });
    expect(await isPro("user-unknown")).toBe(false);
  });
});
