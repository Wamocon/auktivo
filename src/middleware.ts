import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { isProtectedRoute, isAdminRoute, isAuthRoute, extractLocale } from "@/lib/utils/routes";

const schema = (process.env.SUPABASE_DB_SCHEMA ?? "auktivo_dev") as string;

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();

  // Nicht-authentifizierte Nutzer auf Login umleiten
  if (!user && isProtectedRoute(pathname)) {
    const locale = extractLocale(pathname);
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Admin-Routen pruefen
  if (user && isAdminRoute(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      const locale = extractLocale(pathname);
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  // Eingeloggte Nutzer von Auth-Seiten weglenken
  if (user && isAuthRoute(pathname)) {
    const locale = extractLocale(pathname);
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/crawler|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
