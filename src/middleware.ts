import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const schema = (process.env.SUPABASE_DB_SCHEMA ?? "auktivo_dev") as string;

const intlMiddleware = createMiddleware(routing);

const protectedRoutes = ["/dashboard", "/suche", "/objekte", "/favoriten", "/alarme", "/profil", "/upgrade"];
const adminRoutes = ["/admin"];
const authRoutes = ["/login", "/registrieren", "/register", "/passwort-vergessen", "/passwort-zuruecksetzen"];

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname.includes(route));
}

function isAdminRoute(pathname: string): boolean {
  return adminRoutes.some((route) => pathname.includes(route));
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some((route) => pathname.includes(route));
}

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
    const locale = pathname.split("/")[1] ?? "de";
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
      const locale = pathname.split("/")[1] ?? "de";
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  // Eingeloggte Nutzer von Auth-Seiten weglenken
  if (user && isAuthRoute(pathname)) {
    const locale = pathname.split("/")[1] ?? "de";
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/crawler|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
