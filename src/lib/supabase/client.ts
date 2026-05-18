"use client";

import { createBrowserClient } from "@supabase/ssr";

const schema = (process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA ?? "public") as string;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema } }
  );
}

// Named export alias used by profile-client and auth pages
export { createClient as createBrowserClient };
