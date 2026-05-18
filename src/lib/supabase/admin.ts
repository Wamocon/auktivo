import { createClient } from "@supabase/supabase-js";

const schema = (process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA ?? "public") as string;

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
