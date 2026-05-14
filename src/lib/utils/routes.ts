/**
 * Reine Hilfsfunktionen fuer Routing-Klassifizierung
 * Ausgelagert aus middleware.ts fuer einfache Testbarkeit
 */

export const PROTECTED_ROUTES = [
  "/dashboard",
  "/suche",
  "/objekte",
  "/favoriten",
  "/alarme",
  "/profil",
  "/upgrade",
] as const;

export const ADMIN_ROUTES = ["/admin"] as const;

export const AUTH_ROUTES = [
  "/login",
  "/registrieren",
  "/register",
  "/passwort-vergessen",
  "/passwort-zuruecksetzen",
] as const;

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.includes(route));
}

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname.includes(route));
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.includes(route));
}

export function extractLocale(pathname: string, defaultLocale = "de"): string {
  const segment = pathname.split("/")[1];
  return segment === "de" || segment === "en" ? segment : defaultLocale;
}
