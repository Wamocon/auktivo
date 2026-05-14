import { describe, it, expect } from "vitest";
import {
  isProtectedRoute,
  isAdminRoute,
  isAuthRoute,
  extractLocale,
  PROTECTED_ROUTES,
  ADMIN_ROUTES,
  AUTH_ROUTES,
} from "@/lib/utils/routes";

describe("isProtectedRoute", () => {
  it("erkennt /dashboard als geschuetzte Route", () => {
    expect(isProtectedRoute("/de/dashboard")).toBe(true);
  });

  it("erkennt /suche als geschuetzte Route", () => {
    expect(isProtectedRoute("/de/suche")).toBe(true);
  });

  it("erkennt /objekte als geschuetzte Route", () => {
    expect(isProtectedRoute("/de/objekte/abc-123")).toBe(true);
  });

  it("erkennt /favoriten als geschuetzte Route", () => {
    expect(isProtectedRoute("/de/favoriten")).toBe(true);
  });

  it("erkennt /alarme als geschuetzte Route", () => {
    expect(isProtectedRoute("/de/alarme")).toBe(true);
  });

  it("erkennt /profil als geschuetzte Route", () => {
    expect(isProtectedRoute("/de/profil")).toBe(true);
  });

  it("erkennt /upgrade als geschuetzte Route", () => {
    expect(isProtectedRoute("/de/upgrade")).toBe(true);
  });

  it("gibt false fuer oeffentliche Route (Startseite)", () => {
    expect(isProtectedRoute("/de")).toBe(false);
  });

  it("gibt false fuer /login", () => {
    expect(isProtectedRoute("/de/login")).toBe(false);
  });

  it("gibt false fuer /preise", () => {
    expect(isProtectedRoute("/de/preise")).toBe(false);
  });

  it("gibt false fuer /faq", () => {
    expect(isProtectedRoute("/de/faq")).toBe(false);
  });

  it("gibt false fuer leeren Pfad", () => {
    expect(isProtectedRoute("")).toBe(false);
  });

  it("erkennt englische Locale-Variante /en/dashboard", () => {
    expect(isProtectedRoute("/en/dashboard")).toBe(true);
  });

  it("alle PROTECTED_ROUTES werden erkannt", () => {
    for (const route of PROTECTED_ROUTES) {
      expect(isProtectedRoute(`/de${route}`)).toBe(true);
    }
  });
});

describe("isAdminRoute", () => {
  it("erkennt /admin als Admin-Route", () => {
    expect(isAdminRoute("/de/admin")).toBe(true);
  });

  it("erkennt /admin/dashboard als Admin-Route", () => {
    expect(isAdminRoute("/de/admin/dashboard")).toBe(true);
  });

  it("gibt false fuer /dashboard (kein Admin)", () => {
    expect(isAdminRoute("/de/dashboard")).toBe(false);
  });

  it("gibt false fuer / (Startseite)", () => {
    expect(isAdminRoute("/de")).toBe(false);
  });

  it("gibt false fuer leeren Pfad", () => {
    expect(isAdminRoute("")).toBe(false);
  });

  it("alle ADMIN_ROUTES werden erkannt", () => {
    for (const route of ADMIN_ROUTES) {
      expect(isAdminRoute(`/de${route}`)).toBe(true);
    }
  });
});

describe("isAuthRoute", () => {
  it("erkennt /login als Auth-Route", () => {
    expect(isAuthRoute("/de/login")).toBe(true);
  });

  it("erkennt /registrieren als Auth-Route", () => {
    expect(isAuthRoute("/de/registrieren")).toBe(true);
  });

  it("erkennt /register (en) als Auth-Route", () => {
    expect(isAuthRoute("/en/register")).toBe(true);
  });

  it("erkennt /passwort-vergessen als Auth-Route", () => {
    expect(isAuthRoute("/de/passwort-vergessen")).toBe(true);
  });

  it("erkennt /passwort-zuruecksetzen als Auth-Route", () => {
    expect(isAuthRoute("/de/passwort-zuruecksetzen")).toBe(true);
  });

  it("gibt false fuer /dashboard", () => {
    expect(isAuthRoute("/de/dashboard")).toBe(false);
  });

  it("gibt false fuer / (Startseite)", () => {
    expect(isAuthRoute("/de")).toBe(false);
  });

  it("gibt false fuer leeren Pfad", () => {
    expect(isAuthRoute("")).toBe(false);
  });

  it("alle AUTH_ROUTES werden erkannt", () => {
    for (const route of AUTH_ROUTES) {
      expect(isAuthRoute(`/de${route}`)).toBe(true);
    }
  });
});

describe("extractLocale", () => {
  it("extrahiert 'de' aus deutschem Pfad", () => {
    expect(extractLocale("/de/dashboard")).toBe("de");
  });

  it("extrahiert 'en' aus englischem Pfad", () => {
    expect(extractLocale("/en/dashboard")).toBe("en");
  });

  it("gibt Standard-Locale zurueck bei unbekannter Sprache", () => {
    expect(extractLocale("/fr/accueil")).toBe("de");
  });

  it("gibt Standard-Locale zurueck bei leerem Pfad", () => {
    expect(extractLocale("")).toBe("de");
  });

  it("akzeptiert benutzerdefiniertes Standard-Locale", () => {
    expect(extractLocale("/fr/accueil", "en")).toBe("en");
  });

  it("extrahiert Locale aus Pfad ohne Sub-Pfad", () => {
    expect(extractLocale("/de")).toBe("de");
  });
});
