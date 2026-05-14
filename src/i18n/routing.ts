import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
  pathnames: {
    "/": "/",
    "/preise": { de: "/preise", en: "/pricing" },
    "/faq": "/faq",
    "/agb": "/agb",
    "/impressum": "/impressum",
    "/datenschutz": { de: "/datenschutz", en: "/privacy" },
    "/login": "/login",
    "/passwort-vergessen": { de: "/passwort-vergessen", en: "/forgot-password" },
    "/registrieren": { de: "/registrieren", en: "/register" },
    "/dashboard": "/dashboard",
    "/suche": { de: "/suche", en: "/search" },
    "/objekte/[id]": { de: "/objekte/[id]", en: "/properties/[id]" },
    "/objekte/[id]/chat": { de: "/objekte/[id]/chat", en: "/properties/[id]/chat" },
    "/favoriten": { de: "/favoriten", en: "/favorites" },
    "/alarme": { de: "/alarme", en: "/alerts" },
    "/profil": { de: "/profil", en: "/profile" },
    "/upgrade": "/upgrade",
  },
});
