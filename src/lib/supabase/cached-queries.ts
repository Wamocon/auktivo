/**
 * React.cache deduplicates identical calls within a single request.
 * Layout + Page calling getAuthUser() / getProfile() will only hit the DB once.
 */
import { cache } from "react";
import { createClient } from "./server";
import type { Profile } from "@/lib/types/database";

/** Cached auth user - only one GoTrue roundtrip per request */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/** Cached profile - only one PostgREST roundtrip per request */
export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[getProfile] DB error:", error.message, error.code, error.details);
  }

  return data as Profile | null;
});
