import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const schema = (process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA ?? "public") as string;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - cookies koennen nicht gesetzt werden
          }
        },
      },
    }
  );
}
