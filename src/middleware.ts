/**
 * Next.js Middleware - kombiniert Supabase Session-Refresh und next-intl Locale-Routing.
 *
 * WICHTIG: @supabase/ssr benoetigt diese Middleware fuer korrektes Session-Management.
 * Ohne sie werden abgelaufene JWTs nicht erneuert, was zu PGRST301-Fehlern und
 * weissen Seiten bei authentifizierten Anfragen fuehrt.
 */
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. next-intl: Locale-Redirect / Header setzen
  const intlResponse = intlMiddleware(request);

  // 2. Supabase: Session aus Cookies lesen und bei Bedarf erneuern.
  //    Wir nutzen intlResponse als Basis damit next-intl-Header nicht verloren gehen.
  const supabaseResponse = intlResponse ?? NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Cookies im Request aktualisieren (fuer nachfolgende Middleware/Handlers)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Cookies in der Response setzen (fuer den Browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() erneuert die Session automatisch wenn das Access-Token abgelaufen ist.
  // Der Rueckgabewert wird hier nicht verwendet - der Seiteneffekt (Cookie-Update) ist wichtig.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Alle Routen ausser:
     * - _next/static (statische Dateien)
     * - _next/image (Bildoptimierung)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Dateien mit Endungen (Bilder, Fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.[a-zA-Z]{2,4}$).*)",
  ],
};
