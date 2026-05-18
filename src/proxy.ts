import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { isProtectedRoute, isAuthRoute, extractLocale } from "@/lib/utils/routes";

const schema = (process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA ?? "public") as string;

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // next-intl Middleware fuer Sprachweiterleitung
  const intlResponse = intlMiddleware(request);

  let response = intlResponse ?? NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = intlResponse ?? NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession liest Cookie-lokal (kein Netzwerkaufruf) - schnell in Middleware
  // getUser (mit Netzwerkvalidierung) geschieht in Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  // Nicht-authentifizierte Nutzer auf Login umleiten
  if (!user && isProtectedRoute(pathname)) {
    const locale = extractLocale(pathname);
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Admin-Routen: Pruefung geschieht im Admin-Layout (nicht in Middleware)
  // um DB-Aufrufe pro Request zu vermeiden

  // Eingeloggte Nutzer von Auth-Seiten weglenken
  if (user && isAuthRoute(pathname)) {
    const locale = extractLocale(pathname);
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
