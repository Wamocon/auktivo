# Auktivo

**KI-gestuetzte Zwangsversteigerungsanalyse fuer Privatpersonen und Einsteiger-Investoren**

[![Unit Tests](https://github.com/Wamocon/auktivo/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/Wamocon/auktivo/actions/workflows/unit-tests.yml)
[![Lint](https://github.com/Wamocon/auktivo/actions/workflows/validation-lint.yml/badge.svg)](https://github.com/Wamocon/auktivo/actions/workflows/validation-lint.yml)
[![TypeScript](https://github.com/Wamocon/auktivo/actions/workflows/validation-typecheck.yml/badge.svg)](https://github.com/Wamocon/auktivo/actions/workflows/validation-typecheck.yml)
[![Build](https://github.com/Wamocon/auktivo/actions/workflows/validation-build.yml/badge.svg)](https://github.com/Wamocon/auktivo/actions/workflows/validation-build.yml)

---

## Was ist Auktivo?

In Deutschland werden monatlich rund 12.500 Immobilien zwangsversteigert. Das staatliche ZVG-Portal veroeffentlicht Termine und Gutachten als unleserliche PDF- und TIF-Dokumente - eine manuelle Pruefung dauert 1,5 bis 3 Stunden. Privatpersonen sind davon faktisch ausgeschlossen.

Auktivo loest dieses Problem:

- Automatischer taeglicher Crawler importiert alle Versteigerungstermine
- OCR-Pipeline wandelt PDF/TIF-Gutachten in durchsuchbaren Text um
- KI extrahiert Risikosignale (Baulasten, Sanierungsrueckstaende, Mietprobleme, Grundbuchbelastungen)
- KI-Chat-Assistent beantwortet Rueckfragen zum Gutachten in natuerlicher Sprache

**Pruefung in 5-10 Minuten statt 1,5-3 Stunden.**

---

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js 16.2.6 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Datenbank & Auth | Supabase (PostgreSQL, RLS, Schema `auktivo_dev`) |
| KI | AI MAX (OpenAI-kompatibler, selbst gehosteter Endpunkt) |
| Payment | Stripe (monatliches Abo, Customer Portal) |
| i18n | next-intl v4 (Deutsch + Englisch) |
| Tests | Vitest v4, Testing Library (167 Tests, 98.82% Coverage) |
| CI/CD | GitHub Actions + Vercel |

---

## Schnellstart (Lokale Entwicklung)

### Voraussetzungen

- Node.js >= 22
- npm >= 10
- Docker (fuer Supabase lokal)

### 1. Repository klonen

```bash
git clone https://github.com/Wamocon/auktivo.git
cd auktivo
npm install
```

### 2. Umgebungsvariablen einrichten

```bash
cp .env.example .env.local
```

`.env.local` ausfuellen:

```env
# Supabase (lokal)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SUPABASE_DB_SCHEMA=auktivo_dev

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI MAX
MAX_API_BASE_URL=https://your-max-instance.example.com
MAX_API_KEY=your-api-key
MAX_MODEL=max-default
```

### 3. Supabase lokal starten

```bash
npx supabase start
npx supabase db push
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

App laeuft auf [http://localhost:3000](http://localhost:3000).

---

## Verfuegbare Befehle

```bash
npm run dev            # Entwicklungsserver (Turbopack)
npm run build          # Produktions-Build
npm run start          # Produktionsserver starten
npm run lint           # ESLint pruefen
npm run lint:fix       # ESLint automatisch beheben
npm run typecheck      # TypeScript-Check (tsc --noEmit)
npm run test           # Vitest einmalig ausfuehren
npm run test:watch     # Vitest im Watch-Modus
npm run test:coverage  # Vitest mit Coverage-Bericht
npm run verify         # typecheck + lint + build (vor Commit)
```

---

## Projektstruktur

```
src/
  app/                      # Next.js App Router
    [locale]/               # Internationalisierung (de / en)
      (app)/                # Eingeloggte Bereiche (Dashboard, Suche, Objekte)
      (auth)/               # Auth-Seiten (Login, Registrierung)
      (marketing)/          # Oeffentliche Seiten (Landing, Impressum, AGB)
      (admin)/              # Admin-Bereich (WAMOCON intern)
    api/                    # API-Routen (Stripe Webhook, Crawler-Trigger)
  lib/
    ai/max.ts               # KI-Analyse & Chat (AI MAX Client)
    stripe.ts               # Stripe-Integration
    feature-gate.ts         # Free/Pro Plan-Abgrenzung
    email.ts                # E-Mail-Benachrichtigungen (Suchalarm + Crawler-Fehler via Resend)
    supabase/               # Supabase-Clients (Browser, Server, Admin)
    utils/
      routes.ts             # Route-Klassifizierung fuer Middleware
      date.ts               # Datums-Utilities
    types/database.ts       # Supabase-Typdefinitionen
  i18n/
    routing.ts              # next-intl Routing-Konfiguration
    navigation.ts           # Typisierte Navigation-Helpers
  middleware.ts             # Auth + i18n Middleware
  __tests__/                # Vitest Unit-Tests
docs/
  manual/index.html         # Produkthandbuch (GitHub Pages)
.github/
  workflows/                # GitHub Actions CI/CD
  instructions/             # Copilot-Coding-Guidelines
  agents/                   # Copilot Agent-Definitionen
```

---

## Plans & Preise

| Feature | Free | Pro (9,99 EUR/Monat) |
|---|---|---|
| Versteigerungstermine | Ja | Ja |
| Basisdaten (Termin, Ort, Verkehrswert) | Ja | Ja |
| Suche nach PLZ, Umkreis, Objekttyp | Ja | Ja |
| Suchanfragen pro Monat | **Max. 5** | **Unbegrenzt** |
| KI-Risikoanalyse | Nein | **Ja** |
| KI-Chat-Assistent | Nein | **Ja** |
| Alarm-Funktion (Push/E-Mail) | Nein | **Ja** |
| Favoritenliste | Nein | **Ja** |
| PDF-Download | Nein | **Ja** |

---

## CI/CD Workflows

| Workflow | Trigger | Aufgabe |
|---|---|---|
| `unit-tests.yml` | Push alle Branches | Vitest + Coverage (Threshold 80% Branch / 90% Lines) |
| `validation-lint.yml` | Push alle Branches | ESLint |
| `validation-typecheck.yml` | Push alle Branches | TypeScript Check |
| `validation-build.yml` | Push alle Branches | Next.js Build (inkl. devDependencies) |
| `deploy-preview.yml` | Push alle Branches ausser main | Vercel Preview Deploy |
| `deploy-production.yml` | GitHub Release veroeffentlicht | Vercel Produktion |
| `docs.yml` | Push -> main (`docs/`) | GitHub Pages (Produkthandbuch) |

**Benoetigte GitHub Secrets:**
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SUPABASE_DB_SCHEMA`, `NEXT_PUBLIC_APP_URL`,
`SUPABASE_SERVICE_ROLE_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`,
`MAX_API_BASE_URL`, `MAX_API_KEY`, `MAX_MODEL`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`

---

## Tests

```bash
npm run test:coverage
```

```
Tests:    167 passed
Coverage: 98.82% Lines | 99% Stmts | 97.33% Branch | 100% Funcs
          (Thresholds: 80% Branch / 90% Lines / 90% Funcs)
```

| Testdatei | Tests | Coverage |
|---|---|---|
| `routes.test.ts` | 35 | 100% |
| `date.test.ts` | 16 | 100% |
| `feature-gate.test.ts` | 19 | 94% |
| `stripe.test.ts` | 11 | 100% |
| `max.test.ts` | 13 | 100% |
| `email.test.ts` | 22 | 100% Lines / 96% Branch |
| `routing.test.ts` | 12 | 100% |
| `database.test.ts` | 29 | Typen |

---

## Produkthandbuch

Das vollstaendige Produkthandbuch (Architektur, Tutorials, How-to Guides, Routen, DSGVO) ist unter GitHub Pages veroeffentlicht:

**[Produkthandbuch ansehen](https://wamocon.github.io/auktivo/manual/)**

---

## Rechtliches

- [Impressum](https://auktivo.app/de/impressum)
- [Datenschutzerklaerung](https://auktivo.app/de/datenschutz)
- [AGB](https://auktivo.app/de/agb)

**KI-Disclaimer:** Alle KI-Analysen und Chat-Antworten dienen ausschliesslich der Orientierung. Sie ersetzen keine rechtliche, steuerliche oder bautechnische Fachberatung.

---

(c) 2026 WAMOCON GmbH - Alle Rechte vorbehalten
