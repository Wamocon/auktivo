import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/types/database";

export type Feature =
  | "ai_analysis"
  | "ai_chat"
  | "favorites"
  | "alerts"
  | "unlimited_search"
  | "risk_filter";

const PRO_FEATURES: Feature[] = [
  "ai_analysis",
  "ai_chat",
  "favorites",
  "alerts",
  "unlimited_search",
  "risk_filter",
];

export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  return (data?.plan as Plan) ?? "free";
}

export async function canAccess(userId: string, feature: Feature): Promise<boolean> {
  if (!PRO_FEATURES.includes(feature)) return true;
  const plan = await getUserPlan(userId);
  return plan === "pro";
}

export async function checkSearchLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createAdminClient();

  // Pro-Nutzer haben unbegrenzte Suchen - Plan zuerst prüfen, RPC überspringen
  const { data: profileData } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  if (profileData?.plan === "pro") {
    return { allowed: true, remaining: -1 };
  }

  // Nur für Free-Nutzer: atomaren Zähler in DB erhöhen und Limit prüfen
  const { data, error } = await supabase.rpc("increment_search_count", {
    p_user_id: userId,
  });

  if (error) {
    // Bei DB-Fehler: erlauben statt sperren (besser UX, kein False-Negative)
    console.error("checkSearchLimit RPC error:", error);
    return { allowed: true, remaining: 0 };
  }

  return {
    allowed: (data as { allowed?: boolean })?.allowed ?? false,
    remaining: (data as { remaining?: number })?.remaining ?? 0,
  };
}

export async function isPro(userId: string): Promise<boolean> {
  return canAccess(userId, "unlimited_search");
}
