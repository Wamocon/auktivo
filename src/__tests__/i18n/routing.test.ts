import { describe, it, expect } from "vitest";
import { routing } from "@/i18n/routing";

describe("i18n routing", () => {
  it("unterstuetzt die Locales 'de' und 'en'", () => {
    expect(routing.locales).toContain("de");
    expect(routing.locales).toContain("en");
    expect(routing.locales).toHaveLength(2);
  });

  it("hat 'de' als Standard-Locale", () => {
    expect(routing.defaultLocale).toBe("de");
  });

  it("hat Pathnames fuer alle wichtigen Routen", () => {
    const pathnames = routing.pathnames as Record<string, unknown>;
    expect(pathnames).toHaveProperty("/");
    expect(pathnames).toHaveProperty("/preise");
    expect(pathnames).toHaveProperty("/dashboard");
    expect(pathnames).toHaveProperty("/suche");
    expect(pathnames).toHaveProperty("/login");
    expect(pathnames).toHaveProperty("/registrieren");
    expect(pathnames).toHaveProperty("/profil");
    expect(pathnames).toHaveProperty("/favoriten");
    expect(pathnames).toHaveProperty("/alarme");
    expect(pathnames).toHaveProperty("/upgrade");
  });

  it("hat lokalisierte Pfade fuer /preise (de/en)", () => {
    const pathnames = routing.pathnames as Record<string, { de: string; en: string } | string>;
    const preise = pathnames["/preise"];
    expect(preise).toEqual({ de: "/preise", en: "/pricing" });
  });

  it("hat lokalisierte Pfade fuer /suche", () => {
    const pathnames = routing.pathnames as Record<string, { de: string; en: string } | string>;
    const suche = pathnames["/suche"];
    expect(suche).toEqual({ de: "/suche", en: "/search" });
  });

  it("hat lokalisierte Pfade fuer /registrieren", () => {
    const pathnames = routing.pathnames as Record<string, { de: string; en: string } | string>;
    const registrieren = pathnames["/registrieren"];
    expect(registrieren).toEqual({ de: "/registrieren", en: "/register" });
  });

  it("hat lokalisierte Pfade fuer /datenschutz", () => {
    const pathnames = routing.pathnames as Record<string, { de: string; en: string } | string>;
    const datenschutz = pathnames["/datenschutz"];
    expect(datenschutz).toEqual({ de: "/datenschutz", en: "/privacy" });
  });

  it("hat lokalisierte Pfade fuer /favoriten", () => {
    const pathnames = routing.pathnames as Record<string, { de: string; en: string } | string>;
    const favoriten = pathnames["/favoriten"];
    expect(favoriten).toEqual({ de: "/favoriten", en: "/favorites" });
  });

  it("hat lokalisierte Pfade fuer /alarme", () => {
    const pathnames = routing.pathnames as Record<string, { de: string; en: string } | string>;
    const alarme = pathnames["/alarme"];
    expect(alarme).toEqual({ de: "/alarme", en: "/alerts" });
  });

  it("hat lokalisierte Pfade fuer /passwort-vergessen", () => {
    const pathnames = routing.pathnames as Record<string, { de: string; en: string } | string>;
    const pw = pathnames["/passwort-vergessen"];
    expect(pw).toEqual({ de: "/passwort-vergessen", en: "/forgot-password" });
  });

  it("hat dynamische Objekt-Route /objekte/[id]", () => {
    const pathnames = routing.pathnames as Record<string, { de: string; en: string } | string>;
    const objekte = pathnames["/objekte/[id]"];
    expect(objekte).toEqual({ de: "/objekte/[id]", en: "/properties/[id]" });
  });

  it("hat dynamische Chat-Route /objekte/[id]/chat", () => {
    const pathnames = routing.pathnames as Record<string, { de: string; en: string } | string>;
    const chat = pathnames["/objekte/[id]/chat"];
    expect(chat).toEqual({ de: "/objekte/[id]/chat", en: "/properties/[id]/chat" });
  });
});
