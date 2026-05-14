# Implementierungsplan - Auktivo

> Stand: 14. Mai 2026 | Version 1.0 | WAMOCON GmbH

---

## App-Name: Empfehlung und Analyse

### Empfehlung: **ZVGenie**

| Kriterium | Bewertung |
|---|---|
| Einprägsamkeit | Sehr hoch - kombiniert bekanntes ZVG-Kuerzel mit "Genie" |
| Zielgruppen-Relevanz | Sehr hoch - ZVG kennt die Zielgruppe, Genie = KI-Assistent |
| Internationalitaet | Hoch - "Genie" ist international verstaendlich |
| Domain-Verfuegbarkeit | zvgenie.de, zvgenie.com wahrscheinlich frei |
| Markenrecht | Kein bekannter Konflikt |
| Doppelbedeutung | ZVG + Genie (Wunderlampe-Metapher: "Dein Wunsch-Assistent") |

**Alternativen (Fallback-Liste):**

| Name | Konzept | Eignung |
|---|---|---|
| **GavelAI** | Gavel (Auktionshammer) + AI | International, clean |
| **BidLens** | Klare Sicht auf Gebote | Sehr bildlich, modern |
| **Auktivo** | Auktion + "-ivo" Suffix (modern) | Deutsch-nativ, einpraegsam |
| **LotKlar** | Lot (Grundstueck) + klar | Direkter Produktnutzen |
| **ZuschlagAI** | Zuschlag (Hammerschlag, Gewinnmoment) + AI | Fuer Insider sehr stark |

> **App-Name:** Auktivo - KI-gestutzte Analyse von Zwangsversteigerungen in Deutschland.

---

## Technologie-Stack (bestaetigt aus Anforderungsdokument)

| Schicht | Technologie | Begruendung |
|---|---|---|
| Frontend + Backend | Next.js 16 App Router + TypeScript | SSR, API Routes, Server Actions |
| Datenbank + Auth | Supabase (PostgreSQL, RLS, Auth) | EU-Region Frankfurt, DSGVO-konform |
| Styling | Tailwind CSS v4 | Utility-first, Dark Mode native |
| Internationalisierung | next-intl | DE (primaer) + EN, App Router native |
| OCR | AWS Textract (primaer), Google Document AI (Fallback) | >95% Genauigkeit bei TIF/PDF |
| KI-Analyse + Chat | OpenAI GPT-4o (GPT-4.1 als Alternative) | Beste Qualitaet fuer juristische Texte |
| Benachrichtigungen | Resend (E-Mail) + Web Push API | Guenstig, zuverlaessig |
| Payment | Stripe (Subscriptions + Customer Portal) | Branchenstandard, Self-Service-Kuendigung |
| Crawler | Python (Playwright fuer JS-Rendering) | ZVG-Portal-kompatibel |
| Job-Scheduling | Supabase Cron (pg_cron) + Edge Functions | Serverless, keine extra Infrastruktur |
| Hosting | Vercel (Frontend) + Supabase EU-West | One-Click-Deploy |
| E-Mail-Templates | React Email | Type-safe, preview-faehig |
| Monitoring | Vercel Analytics + Sentry | Fehler- und Performance-Tracking |

---

## Datenbankschema (Supabase PostgreSQL)

### Tabellen-Uebersicht

```sql
-- Nutzer (erweitert Supabase auth.users)
profiles (
  id uuid references auth.users primary key,
  email text not null,
  full_name text,
  plan text default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  monthly_search_count integer default 0,
  monthly_search_reset_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Zwangsversteigerungsobjekte (vom Crawler befuellt)
properties (
  id uuid primary key default gen_random_uuid(),
  zvg_id text unique not null,              -- ID vom ZVG-Portal
  court text not null,                      -- Amtsgericht
  court_file_number text,                   -- Aktenzeichen
  auction_date timestamptz,                 -- Versteigerungstermin
  property_type text,                       -- Haus, Wohnung, Gewerbe, Grundstueck
  address text,
  city text,
  zip_code text not null,
  state text,
  lat numeric,
  lng numeric,
  market_value numeric,                     -- Verkehrswert in EUR
  minimum_bid numeric,                      -- Mindestgebot (50% Regelung)
  document_urls text[],                     -- Links zu Originaldokumenten
  raw_html text,                            -- Rohdata vom Crawler
  status text default 'active'              -- active, withdrawn, sold
    check (status in ('active', 'withdrawn', 'sold')),
  last_crawled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- OCR-Ergebnisse pro Dokument
property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  original_url text not null,
  document_type text,                       -- gutachten, beschluss, sonstig
  ocr_text text,                            -- Volltext nach OCR
  ocr_status text default 'pending'
    check (ocr_status in ('pending', 'processing', 'done', 'failed')),
  ocr_confidence numeric,
  file_size_bytes integer,
  page_count integer,
  processed_at timestamptz,
  created_at timestamptz default now()
)

-- KI-Risikoanalysen pro Objekt
property_analyses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  risk_level text check (risk_level in ('low', 'medium', 'high', 'critical')),
  risk_signals jsonb,                       -- Strukturierte Warnsignale
  -- Beispiel risk_signals:
  -- {
  --   "baulasten": [{"text": "...", "severity": "high"}],
  --   "sanierungsbedarf": [{"text": "...", "cost_estimate": "50000-80000"}],
  --   "mietverhaeltnisse": [{"text": "...", "severity": "medium"}],
  --   "grundbuchbelastungen": [{"text": "...", "severity": "high"}]
  -- }
  summary text,                             -- KI-generierte Kurzfassung
  analysis_model text,                      -- gpt-4o, etc.
  prompt_version text,                      -- Versionierung des Prompts
  analysis_status text default 'pending'
    check (analysis_status in ('pending', 'processing', 'done', 'failed')),
  analyzed_at timestamptz,
  created_at timestamptz default now()
)

-- Chat-Nachrichten (RAG-Kontext pro Sitzung)
chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  messages jsonb default '[]',             -- Array von {role, content, created_at}
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Favoriten (Pro-Feature)
favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, property_id)
)

-- Suchalarm-Konfigurationen (Pro-Feature)
search_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  zip_codes text[],                         -- PLZ-Liste
  radius_km integer default 25,
  property_types text[],
  min_market_value numeric,
  max_market_value numeric,
  notification_email boolean default true,
  notification_push boolean default false,
  is_active boolean default true,
  last_triggered_at timestamptz,
  created_at timestamptz default now()
)

-- Crawler-Laufprotokoll (fuer Admin-Dashboard)
crawler_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text default 'running'
    check (status in ('running', 'completed', 'failed')),
  new_properties_count integer default 0,
  updated_properties_count integer default 0,
  failed_urls text[],
  error_message text
)
```

### Row Level Security (RLS) Regeln

```sql
-- profiles: Nur eigenes Profil lesbar/editierbar
-- properties: Oeffentlich lesbar (Basisdaten), KI-Analyse nur fuer Pro-Nutzer via API
-- property_analyses: Kein direkter Zugriff - nur ueber API Route (Plan-Check)
-- chat_sessions: Nur eigene Sitzungen
-- favorites: Nur eigene Favoriten
-- search_alerts: Nur eigene Alarme
-- crawler_runs: Nur Admins
```

---

## Architektur-Uebersicht

```
[ZVG-Portal]
     |
     v (taeglicher Cron)
[Python Crawler]  --------> [Supabase Storage] (PDF/TIF-Rohdateien)
     |                              |
     v                              v
[Supabase DB: properties]   [OCR-Pipeline]
                                    |
                            [AWS Textract / Google Doc AI]
                                    |
                            [property_documents.ocr_text]
                                    |
                            [KI-Analyse-Pipeline] (OpenAI GPT-4o)
                                    |
                            [property_analyses: risk_signals]
                                    |
                    ________________________________
                   |                                |
          [Next.js Frontend]              [Alert-Service]
          - Landing Page                  - Resend (E-Mail)
          - Dashboard                     - Web Push API
          - Suche + Filter
          - Objekt-Detailseite
          - KI-Chat (Pro)
          - Profil + Abo
          - Admin-Bereich
```

---

## Implementierungsplan - 6 Tage / 6 Phasen

---

### Phase 1 - Projekfundament (Tag 1)

#### 1.1 Projekt-Setup und Branding

**Ziele:** Saubere Basis, alle Abhaengigkeiten installiert, App laeuft fehlerfrei.

**Aufgaben:**
1. `package.json` umbenennen: `"name": "zvgenie"`
2. Paketinstallation:
   ```bash
   npm install @supabase/ssr @supabase/supabase-js
   npm install next-intl
   npm install stripe @stripe/stripe-js
   npm install resend
   npm install openai
   npm install web-push
   npm install zod
   npm install @tanstack/react-query
   npm install lucide-react
   npm install react-email @react-email/components
   npm install -D @types/web-push
   ```
3. Umgebungsvariablen anlegen (`.env.local`):
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   SUPABASE_DB_SCHEMA=public

   # OpenAI
   OPENAI_API_KEY=

   # Stripe
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
   STRIPE_PRO_PRICE_ID=

   # Resend
   RESEND_API_KEY=
   RESEND_FROM_EMAIL=noreply@zvgenie.de

   # AWS Textract (OCR)
   AWS_ACCESS_KEY_ID=
   AWS_SECRET_ACCESS_KEY=
   AWS_REGION=eu-central-1

   # Web Push
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=
   VAPID_PRIVATE_KEY=
   VAPID_SUBJECT=mailto:admin@zvgenie.de

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=ZVGenie
   CRON_SECRET=
   ```
4. Supabase-Client erstellen (`src/lib/supabase/`)
5. Middleware fuer Auth-Session-Refresh
6. next-intl konfigurieren (DE primaer, EN sekundaer)
7. Dark/Light Mode Grundstruktur (Tailwind CSS v4)
8. App-Logo und Favicon erstellen (SVG, professionell)

#### 1.2 Supabase Datenbankschema

**Aufgaben:**
1. Alle Tabellen via Supabase-Migration anlegen (siehe Schema oben)
2. RLS-Policies aktivieren
3. Indexes anlegen (zip_code, auction_date, plan-basierte Abfragen)
4. `pg_cron`-Extension aktivieren fuer Crawler-Scheduling
5. Database Functions:
   - `increment_search_count(user_id)` - erhoeht Zaehler, prueft Limit
   - `reset_monthly_search_counts()` - monatliches Reset (Cron)
   - `get_properties_for_alert(alert_id)` - Alert-Matching

#### 1.3 Authentifizierung

**Aufgaben:**
1. Supabase Auth: E-Mail + Passwort (Magic Link als Option)
2. Seiten:
   - `/auth/login`
   - `/auth/register`
   - `/auth/confirm` (E-Mail-Bestaetigung)
   - `/auth/reset-password`
   - `/auth/update-password`
3. `profiles`-Tabelle via `auth.users` Trigger befuellen
4. Middleware: Geschuetzte Routen (`/dashboard`, `/admin`)
5. Auth-Kontext via Server Components + Cookies

#### 1.4 Stripe Integration

**Aufgaben:**
1. Stripe-Produkt anlegen: Pro-Abo, 9,99 EUR/Monat, monatlich kuendigbar
2. Checkout-Flow: `/api/stripe/create-checkout` (Server Action)
3. Webhook-Handler: `/api/webhooks/stripe`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Customer Portal: `/api/stripe/portal` (Self-Service-Kuendigung)
5. Plan-Pruefung: Utility-Funktion `isPro(userId)` via Supabase

#### 1.5 Feature-Gate System

```typescript
// src/lib/feature-gate.ts
type Feature = 'ai_analysis' | 'ai_chat' | 'favorites' | 'alerts' | 'unlimited_search'

async function canAccess(userId: string, feature: Feature): Promise<boolean>
async function checkSearchLimit(userId: string): Promise<{ allowed: boolean; remaining: number }>
```

---

### Phase 2 - Daten-Pipeline (Tag 2)

#### 2.1 Python-Crawler

**Technologie:** Python 3.12 + Playwright (kein Scrapy - ZVG-Portal hat JS-Rendering)

**Verzeichnisstruktur:**
```
crawler/
  requirements.txt
  crawler.py          # Hauptlogik
  parser.py           # HTML-Parsing, Datenextraktion
  storage.py          # Supabase-Upload
  monitor.py          # Alert bei Crawler-Fehlern
  Dockerfile          # Optional: containerisierter Betrieb
  README.md
```

**Ablauf:**
1. Playwright oeffnet zvg-portal.de
2. Iteriert ueber alle Bundeslaender
3. Extrahiert pro Termin: Aktenzeichen, Gericht, Datum, Ort, PLZ, Verkehrswert, Objekttyp, Dokumentenlinks
4. Laedt PDF/TIF-Dokumente in Supabase Storage
5. Speichert Properties in Supabase DB
6. Protokolliert in `crawler_runs`

**Triggering:**
- Supabase Edge Function (Cron) ruft `/api/crawler/trigger` auf
- Alternativ: GitHub Actions (taeglicher Cron)
- Admin kann manuell triggern via Dashboard

**Fehlerbehandlung:**
- Retry-Logik (3 Versuche pro URL)
- Timeout von 30s pro Seite
- Alert an Admin via Resend bei Fehler

**Wichtige Felder fuer Parser:**
```python
{
  "zvg_id": str,           # Eindeutige ID vom Portal
  "court": str,            # Amtsgericht
  "court_file_number": str,
  "auction_date": datetime,
  "property_type": str,    # Normalisiert: house|apartment|commercial|land
  "address": str,
  "city": str,
  "zip_code": str,
  "state": str,
  "market_value": float,
  "document_urls": list[str]
}
```

#### 2.2 OCR-Pipeline

**Technologie:** AWS Textract (primaer), Google Document AI (Fallback)

**Implementierung als Supabase Edge Function:**

```
/api/ocr/process  POST
Body: { documentId: string, propertyId: string, fileUrl: string }
```

**Ablauf:**
1. Datei aus Supabase Storage laden
2. An AWS Textract senden (async Job fuer >1 Seite)
3. Text extrahieren und in `property_documents.ocr_text` speichern
4. Status auf `done` setzen
5. KI-Analyse-Job triggern

**Qualitaetssicherung:**
- `ocr_confidence` speichern
- Wenn Confidence < 60%: Warnung in UI anzeigen ("Dokument teilweise unleserlich")
- Fallback auf Google Document AI wenn Textract fehlschlaegt

**Verarbeitung nach Crawler-Lauf:**
- Fuer jedes neue Property werden alle Dokumente in eine Queue gestellt
- Queue-Verarbeitung: 3 parallele Jobs max. (API-Limits)

---

### Phase 3 - KI-Layer (Tag 3)

#### 3.1 KI-Risikoanalyse

**Model:** OpenAI GPT-4o (mit strukturiertem Output via `response_format: { type: "json_schema" }`)

**API-Route:** `/api/ai/analyze` (Server Action, nur Pro-Check intern)

**Prompt-Strategie (Konservativ-Bias):**
```
System: Du bist ein erfahrener Immobiliengutachter. Analysiere das folgende 
Gutachten einer Zwangsversteigerung und extrahiere Risikosignale. 
Im Zweifel: lieber mehr Warnungen als zu wenige.
Antworte NUR mit dem angegebenen JSON-Schema.
Fuege bei jeder Ausgabe einen KI-Disclaimer ein.

User: [OCR-Text des Gutachtens - bis zu 100.000 Tokens via GPT-4o]
```

**Output-Schema:**
```typescript
{
  risk_level: "low" | "medium" | "high" | "critical",
  summary: string, // 3-5 Saetze, verstaendliche Sprache
  baulasten: Array<{ description: string; severity: "low"|"medium"|"high"; text_excerpt: string }>,
  sanierungsbedarf: Array<{ description: string; cost_estimate_eur?: string; severity: string; text_excerpt: string }>,
  mietverhaeltnisse: Array<{ description: string; severity: string; text_excerpt: string }>,
  grundbuchbelastungen: Array<{ description: string; type: string; amount_eur?: number; severity: string }>,
  positive_signals: Array<{ description: string }>,
  disclaimer: string // Immer sichtbar
}
```

**Chunking fuer grosse Dokumente:**
- GPT-4o unterstuetzt 128k Tokens
- Bei >100k Tokens: Dokument in Abschnitte teilen, Ergebnisse zusammenfuehren
- Immer: Erste und letzte 20 Seiten priorisieren (Kerninfos im Gutachten)

**Prompt-Versioning:**
- `prompt_version` in DB speichern (z.B. "v1.2")
- Bei Prompt-Updates: Re-Analyse auf Anfrage moeglich

#### 3.2 KI-Chat-Assistent

**Model:** OpenAI GPT-4o (Streaming-API)

**API-Route:** `/api/ai/chat` (POST, Pro-Gate)

**RAG-Ansatz (Retrieval Augmented Generation):**
```
System: Du bist ein hilfreicher Assistent fuer Immobilienkaefer. 
Dir steht folgendes Gutachten zur Verfuegung: [OCR-Text + Analyse]
Beantworte Fragen nur auf Basis dieses Dokuments.
Bei Unsicherheit: Sage klar, dass du es nicht weisst.
KI-Disclaimer: Alle Antworten ersetzen keine Fachberatung.

History: [Bisherige Nachrichten aus chat_sessions]
User: [Aktuelle Frage]
```

**Streaming:** `ReadableStream` API, Response-Streaming via Next.js Route Handler

**Sicherheit:**
- Input-Sanitierung (kein Prompt-Injection)
- Rate Limiting: 50 Nachrichten pro Sitzung
- Token-Limit pro Antwort: 1000 Tokens

**Chat-UI Features:**
- Markdown-Rendering der KI-Antworten
- "Lade..."-Indikator waehrend Streaming
- Sitzung pro Objekt gespeichert (Kontext bleibt erhalten)
- KI-Disclaimer unter JEDER Antwort sichtbar (nicht wegklickbar)

#### 3.3 KI-Disclaimer-System

Rechtlich zwingend - immer sichtbar, nicht wegklickbar:

```
⚠️ KI-Hinweis: Diese Analyse wurde automatisch erstellt und dient 
ausschliesslich der Orientierung. Sie ersetzt keine rechtliche, 
steuerliche oder bautechnische Fachberatung. WAMOCON GmbH uebernimmt 
keine Haftung fuer die Richtigkeit der KI-Ausgaben.
```

---

### Phase 4 - Frontend (Tag 4)

#### 4.1 Seitenstruktur (App Router)

```
src/app/
  [locale]/                    # next-intl: de | en
    (marketing)/               # Route Group: oeffentliche Seiten
      page.tsx                 # Landing Page (Homepage)
      preise/page.tsx          # Pricing Page
      faq/page.tsx             # FAQ + ZVG-Prozess-Erklaerung
      legal/
        agb/page.tsx
        impressum/page.tsx
        datenschutz/page.tsx
    (auth)/                    # Route Group: Auth-Seiten
      login/page.tsx
      registrieren/page.tsx
      passwort-vergessen/page.tsx
      passwort-zuruecksetzen/page.tsx
      bestaetigung/page.tsx
    (app)/                     # Route Group: Authenticated
      layout.tsx               # Sidebar + Header
      dashboard/page.tsx       # Hauptuebersicht
      suche/page.tsx           # Suche + Filter
      objekte/
        [id]/page.tsx          # Objektdetailseite
        [id]/chat/page.tsx     # KI-Chat (Pro)
      favoriten/page.tsx       # Favoritenliste (Pro)
      alarme/page.tsx          # Suchalarm-Verwaltung (Pro)
      profil/page.tsx          # Profilseite + Abo-Verwaltung
      upgrade/page.tsx         # Pro-Upgrade CTA
    (admin)/                   # Route Group: Admin-only
      admin/
        layout.tsx
        dashboard/page.tsx     # Crawler-Status, Nutzer
        crawler/page.tsx       # Crawler konfigurieren + triggern
        nutzer/page.tsx        # Nutzerverwaltung
        abonnements/page.tsx   # Abo-Uebersicht

  api/
    webhooks/stripe/route.ts
    crawler/trigger/route.ts
    ocr/process/route.ts
    ai/analyze/route.ts
    ai/chat/route.ts
    search/route.ts
    alerts/notify/route.ts
    push/subscribe/route.ts
```

#### 4.2 Landing Page (Homepage)

**Sektionen:**
1. **Hero** - "Zwangsversteigerungen intelligent analysieren" + CTA ("Kostenlos starten")
2. **Problem-Sektion** - "70% springen frustriert ab" - Statistiken visuell
3. **Loesung** - 3-Schritt-Erklaerung: Suchen → Analysieren lassen → Sicher bieten
4. **Feature-Showcase** - Mock-UI der KI-Risikoanalyse und Chat
5. **Preise** - Free vs. Pro Vergleichstabelle (Lock-Icons bei Pro-Features)
6. **Social Proof** - "Schon 200.000 Nutzer besuchen das ZVG-Portal monatlich"
7. **FAQ** - Top 5 Fragen
8. **Footer** - Logo, Links, WAMOCON-Impressum, Datenschutz, AGB

#### 4.3 Dashboard

**Komponenten:**
- Neue Versteigerungen in letzten 7 Tagen (Karten-View)
- Gespeicherte Favoriten (Preview)
- Letzter Crawler-Status (Zeitstempel + Anzahl neue Objekte)
- Free-Plan-Zaehler: "3 von 5 Suchen verbraucht" + Upgrade-CTA
- Kommende Versteigerungen (Kalender-Widget)

#### 4.4 Suche und Filterseite

**Filter:**
```typescript
{
  zip_code: string,
  radius_km: 10 | 25 | 50 | 100,
  property_type: ('house' | 'apartment' | 'commercial' | 'land')[],
  auction_date_from: Date,
  auction_date_to: Date,
  market_value_min: number,
  market_value_max: number,
  risk_level: ('low' | 'medium' | 'high' | 'critical')[]  // nur Pro
}
```

**Feature-Gating:**
- Free: 5 Suchen/Monat, kein risk_level-Filter
- Pro: Unbegrenzt + alle Filter
- Lock-Icon bei gesperrten Filtern

**Ergebnisdarstellung:**
- Karten mit: Vorschaubild (falls vorhanden), Ort, Datum, Verkehrswert, Risk-Badge
- Sortierung: Datum, Verkehrswert, Risikostufe
- Infinite Scroll oder Pagination

#### 4.5 Objektdetailseite `/objekte/[id]`

**Layout (2 Spalten auf Desktop):**

Links (70%):
- Objekt-Header: Ort, Gericht, Aktenzeichen, Datum
- Verkehrswert + Mindestgebot-Berechnung (50%-Regel erklaert)
- KI-Risikoanalyse-Uebersicht (Pro-Gate mit Overlay fuer Free)
- Strukturierte Warnsignale (Badges: rot/orange/gelb/gruen)
- KI-Zusammenfassung
- Original-Dokumente (Download-Links)

Rechts (30%):
- "Jetzt bieten"-CTA (externer Link zu ZVG-Portal)
- Favorit-Button (Pro)
- Teilen-Button
- KI-Chat starten (Pro)
- Upgrade-CTA wenn Free

**Free-Plan Overlay:**
- Basisinfos sichtbar (Datum, Ort, Verkehrswert)
- KI-Analyse als Blur-Overlay mit "Pro freischalten" CTA

#### 4.6 Upgrade-Seite

- Klarer Feature-Vergleich Free vs. Pro
- Stripe Checkout Button
- FAQ zu Kuendigung und Zahlung
- SSL/Sicherheits-Badges

---

### Phase 5 - Services und Compliance (Tag 5)

#### 5.1 E-Mail-Benachrichtigungen (Resend)

**Templates (React Email):**
1. `WelcomeEmail` - Registrierungsbestaetigung
2. `ConfirmEmail` - E-Mail-Verifizierung
3. `ResetPasswordEmail` - Passwort zuruecksetzen
4. `AlertNotificationEmail` - Neue Treffer fuer Suchalarm
5. `UpgradeConfirmationEmail` - Pro-Upgrade bestaetigt
6. `CancellationEmail` - Kuendigungsbestaetigung
7. `CrawlerErrorEmail` - Admin-Alert bei Crawler-Ausfall

#### 5.2 Web Push Notifications (Pro)

```typescript
// src/lib/push.ts
async function subscribeToPush(subscription: PushSubscription, userId: string)
async function sendPushNotification(userId: string, title: string, body: string, url: string)
```

- VAPID-Keys generiert und in ENV gespeichert
- Opt-in Flow in Profilseite
- Push nur wenn Browser-Permission erteilt

#### 5.3 DSGVO-Compliance

**Funktionen (Pflicht):**

1. **Cookie-Consent-Banner:**
   - Erstbesuch: Modal mit "Ablehnen" / "Akzeptieren"
   - Nur notwendige Cookies ohne Zustimmung
   - Einstellung in Profil aenderbar

2. **Datenexport (Art. 20 DSGVO):**
   - `/api/gdpr/export` - Generiert JSON mit allen Nutzerdaten
   - Download-Link per E-Mail zugesandt

3. **Kontoloeschung (Art. 17 DSGVO):**
   - Selbst-Service in Profilseite
   - Bestaetigung per Passwort
   - Loescht: Profile, Favoriten, Alarme, Chat-Sitzungen
   - Stripe-Abo wird kuendigungsbedingt beendet
   - Daten anonymisiert (nicht geloescht) bei laufendem Abo

4. **Datenschutzerklaerung, AGB, Impressum:**
   - Aus `legal-docs/` Ordner laden und als statische Seiten rendern
   - Footer-Links immer sichtbar

#### 5.4 Admin-Bereich

**Zugang:** Rollenbasiert - `is_admin` Flag in `profiles`

**Admin-Dashboard Seiten:**

1. **Uebersicht:**
   - Gesamt-Nutzer, Free- vs. Pro-Nutzer, MRR
   - Letzter Crawler-Lauf: Status, neue Objekte, Fehler

2. **Crawler:**
   - Konfiguration: Zeitplan, Bundeslaender-Auswahl
   - Manueller Trigger-Button
   - Log der letzten 10 Laeufe

3. **Nutzerverwaltung:**
   - Nutzerliste (suchbar)
   - Plan aendern, Nutzer sperren

4. **Objektverwaltung:**
   - Manueller Re-Import-Trigger
   - OCR-Status Uebersicht
   - Analyse-Status Uebersicht

#### 5.5 Feature-Abgrenzung Free vs. Pro (UI)

**Lock-Icon-Regel:**
- Alle gesperrten Features: `<LockIcon />` + Tooltip "Pro-Feature - Jetzt upgraden"
- Kein funktionaler Code hinter Lock - sichtbar aber nicht klickbar (ausser Upgrade-CTA)

**Upgrade-CTA Positionen:**
1. Navigation: "Upgrade" Button (orange/amber, immer sichtbar fuer Free-Nutzer)
2. KI-Analyse Blur-Overlay auf Detailseite
3. Freischalt-Modal bei Klick auf gesperrtes Feature
4. Dashboard: Suchzaehler-Widget
5. Seite `/upgrade` mit vollem Feature-Vergleich

---

### Phase 6 - Verifikation und Deployment (Tag 6 - Puffertag)

#### 6.1 Pflicht-Checkliste vor Release

```
[ ] npm run typecheck - 0 Fehler
[ ] npm run lint - 0 Warnungen
[ ] npm run build - Kein Build-Fehler
[ ] next-browser errors - Keine Runtime-Fehler
[ ] next-browser perf - CLS < 0.1, LCP < 2.5s
[ ] Stripe Webhook getestet (Test-Modus)
[ ] Crawler einmal manuell gestartet und Daten in DB
[ ] OCR Pipeline getestet (Beispiel-PDF)
[ ] KI-Analyse getestet (Beispiel-Gutachten)
[ ] KI-Chat getestet (Beispiel-Session)
[ ] E-Mail-Templates getestet (alle 7)
[ ] DSGVO-Datenexport getestet
[ ] Kontoloeschung getestet
[ ] Cookie-Banner getestet
[ ] Free-Limit (5 Suchen) getestet
[ ] Pro-Upgrade Flow getestet (Stripe Test)
[ ] Admin-Bereich Zugang und Funktionen getestet
[ ] Responsive Design getestet (Mobile, Tablet, Desktop)
[ ] Dark Mode getestet (alle Key-Screens)
[ ] Sprachschalter DE/EN getestet
[ ] KI-Disclaimer sichtbar bei Analyse und Chat
[ ] Rechtliche Seiten vorhanden (AGB, Impressum, Datenschutz)
```

#### 6.2 Vercel Deployment

**Environment Variables:** Alle in Vercel Dashboard eintragen

**next.config.ts Anpassungen:**
```typescript
const nextConfig = {
  serverExternalPackages: ['openai'],
  images: {
    domains: ['supabase.co', 'storage.googleapis.com'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
}
```

**Vercel-spezifische Regeln:**
- Edge Functions Timeout: 30s (OCR und KI via Vercel Pro erhoehen falls noetig)
- Streaming: Sichergestellt fuer KI-Chat
- Caching: ISR fuer Objekt-Detailseiten (revalidate: 3600)

---

## Risiken und Gegenmassnahmen

| Risiko | Wahrscheinlichkeit | Auswirkung | Massnahme |
|---|---|---|---|
| ZVG-Portal aendert HTML-Struktur | Niedrig | Hoch | Crawler-Test taeglicher Alert, schnelles Re-Mapping |
| OpenAI API-Ausfall | Niedrig | Hoch | Fehler-UI: "Analyse voruebergehend nicht verfuegbar" |
| AWS Textract OCR-Fehler | Mittel | Mittel | Google Document AI als Fallback, Nutzer-Hinweis |
| Stripe Webhook-Fehler | Niedrig | Hoch | Idempotente Handler, Resend-Retry |
| DSGVO-Verstoess | Niedrig | Sehr hoch | Rechtspruefung vor Launch, Cookie-Banner, Datenschutzerklaerung |
| KI-Fehlanaylse | Mittel | Mittel | Konservativ-Bias, Disclaimer, keine Haftungsuebernahme |

---

## Abgrenzung Version 1 vs. Version 2

| Feature | V1 | V2 |
|---|---|---|
| Crawler + OCR + KI-Analyse | Ja | - |
| KI-Chat | Ja | - |
| Suche + Filter | Ja | - |
| Favoriten | Ja | - |
| Suchalarm (E-Mail + Push) | Ja | - |
| Stripe-Abo | Ja | - |
| DSGVO-Compliance | Ja | - |
| Admin-Bereich | Ja | - |
| API-Zugang | Nein | Ja |
| White-Label | Nein | Ja |
| Mehrnutzerkonten (Makler) | Nein | Ja |
| Bundesland-uebergreifende Karte | Nein | Ja |
| Bieterhistorie-Tracking | Nein | Ja |

---

## Zusammenfassung: Erste Implementierungsschritte

1. Supabase-Datenbank fragen: **Hosted oder Local?** (Pflichtfrage per Copilot-Instructions)
2. App-Name `ZVGenie` bestaetigen
3. Mit Phase 1 beginnen (Projekfundament, Schema, Auth, Stripe)
4. Dann Phase 2 (Crawler - Python-Skript separat, wird via API-Route getriggert)
5. OCR + KI parallel zu Frontend entwickeln (Tag 3 und 4 koennen teilweise parallel laufen)

---

*Dokument erstellt: 14. Mai 2026 | GitHub Copilot fuer WAMOCON GmbH*
