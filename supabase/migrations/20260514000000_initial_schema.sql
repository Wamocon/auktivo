-- =============================================================
-- Auktivo - Initial Schema Migration
-- Schema: auktivo_dev (lokal) | auktivo_test (preview) | auktivo_prod (prod)
-- =============================================================

-- Schema erstellen (Name kommt aus SUPABASE_DB_SCHEMA env)
-- Lokal: auktivo_dev | Preview: auktivo_test | Prod: auktivo_prod
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auktivo_dev') THEN
    CREATE SCHEMA auktivo_dev;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auktivo_test') THEN
    CREATE SCHEMA auktivo_test;
  END IF;
END $$;

-- Alle Tabellen im auktivo_dev Schema erstellen
SET search_path TO auktivo_dev, public;

-- =============================================================
-- 1. PROFILES (erweitert auth.users)
-- =============================================================
CREATE TABLE IF NOT EXISTS auktivo_dev.profiles (
  id            uuid          REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         text          NOT NULL,
  full_name     text,
  plan          text          NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  is_admin      boolean       NOT NULL DEFAULT false,
  stripe_customer_id      text UNIQUE,
  stripe_subscription_id  text UNIQUE,
  subscription_status     text,
  monthly_search_count    integer NOT NULL DEFAULT 0,
  monthly_search_reset_at timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

-- =============================================================
-- 2. PROPERTIES (Zwangsversteigerungsobjekte)
-- =============================================================
CREATE TABLE IF NOT EXISTS auktivo_dev.properties (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  zvg_id            text        UNIQUE NOT NULL,
  court             text        NOT NULL,
  court_file_number text,
  auction_date      timestamptz,
  property_type     text        CHECK (property_type IN ('house', 'apartment', 'commercial', 'land', 'other')),
  address           text,
  city              text,
  zip_code          text        NOT NULL,
  state             text,
  lat               numeric(10,7),
  lng               numeric(10,7),
  market_value      numeric(15,2),
  minimum_bid       numeric(15,2),
  document_urls     text[]      NOT NULL DEFAULT '{}',
  raw_html          text,
  status            text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'sold')),
  last_crawled_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_zip_code ON auktivo_dev.properties(zip_code);
CREATE INDEX IF NOT EXISTS idx_properties_auction_date ON auktivo_dev.properties(auction_date);
CREATE INDEX IF NOT EXISTS idx_properties_status ON auktivo_dev.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON auktivo_dev.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_market_value ON auktivo_dev.properties(market_value);

-- =============================================================
-- 3. PROPERTY_DOCUMENTS (OCR-Ergebnisse)
-- =============================================================
CREATE TABLE IF NOT EXISTS auktivo_dev.property_documents (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid        NOT NULL REFERENCES auktivo_dev.properties(id) ON DELETE CASCADE,
  original_url    text        NOT NULL,
  document_type   text        CHECK (document_type IN ('gutachten', 'beschluss', 'sonstig')),
  ocr_text        text,
  ocr_status      text        NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'done', 'failed')),
  ocr_confidence  numeric(5,2),
  file_size_bytes integer,
  page_count      integer,
  processed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_property_id ON auktivo_dev.property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_ocr_status ON auktivo_dev.property_documents(ocr_status);

-- =============================================================
-- 4. PROPERTY_ANALYSES (KI-Risikoanalysen)
-- =============================================================
CREATE TABLE IF NOT EXISTS auktivo_dev.property_analyses (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       uuid        NOT NULL REFERENCES auktivo_dev.properties(id) ON DELETE CASCADE,
  risk_level        text        CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_signals      jsonb       NOT NULL DEFAULT '{}',
  summary           text,
  analysis_model    text,
  prompt_version    text        NOT NULL DEFAULT 'v1.0',
  analysis_status   text        NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'done', 'failed')),
  error_message     text,
  analyzed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_property_unique ON auktivo_dev.property_analyses(property_id);
CREATE INDEX IF NOT EXISTS idx_analyses_risk_level ON auktivo_dev.property_analyses(risk_level);

-- =============================================================
-- 5. CHAT_SESSIONS (KI-Chat pro Objekt/Nutzer)
-- =============================================================
CREATE TABLE IF NOT EXISTS auktivo_dev.chat_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid        NOT NULL REFERENCES auktivo_dev.properties(id) ON DELETE CASCADE,
  messages    jsonb       NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON auktivo_dev.chat_sessions(user_id);

-- =============================================================
-- 6. FAVORITES (Pro-Feature)
-- =============================================================
CREATE TABLE IF NOT EXISTS auktivo_dev.favorites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid        NOT NULL REFERENCES auktivo_dev.properties(id) ON DELETE CASCADE,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON auktivo_dev.favorites(user_id);

-- =============================================================
-- 7. SEARCH_ALERTS (Pro-Feature)
-- =============================================================
CREATE TABLE IF NOT EXISTS auktivo_dev.search_alerts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text        NOT NULL,
  zip_codes           text[]      NOT NULL DEFAULT '{}',
  radius_km           integer     NOT NULL DEFAULT 25,
  property_types      text[]      NOT NULL DEFAULT '{}',
  min_market_value    numeric(15,2),
  max_market_value    numeric(15,2),
  notification_email  boolean     NOT NULL DEFAULT true,
  notification_push   boolean     NOT NULL DEFAULT false,
  is_active           boolean     NOT NULL DEFAULT true,
  last_triggered_at   timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON auktivo_dev.search_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON auktivo_dev.search_alerts(is_active);

-- =============================================================
-- 8. PUSH_SUBSCRIPTIONS (Web Push)
-- =============================================================
CREATE TABLE IF NOT EXISTS auktivo_dev.push_subscriptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint        text        NOT NULL UNIQUE,
  p256dh          text        NOT NULL,
  auth            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- 9. CRAWLER_RUNS (Admin-Monitoring)
-- =============================================================
CREATE TABLE IF NOT EXISTS auktivo_dev.crawler_runs (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at              timestamptz NOT NULL DEFAULT now(),
  finished_at             timestamptz,
  status                  text        NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  new_properties_count    integer     NOT NULL DEFAULT 0,
  updated_properties_count integer    NOT NULL DEFAULT 0,
  failed_urls             text[]      NOT NULL DEFAULT '{}',
  error_message           text
);

-- =============================================================
-- RLS AKTIVIEREN
-- =============================================================
ALTER TABLE auktivo_dev.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE auktivo_dev.properties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE auktivo_dev.property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE auktivo_dev.property_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE auktivo_dev.chat_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE auktivo_dev.favorites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE auktivo_dev.search_alerts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE auktivo_dev.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auktivo_dev.crawler_runs      ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- RLS POLICIES
-- =============================================================

-- profiles: Eigenes Profil lesen und updaten
CREATE POLICY "profiles_select_own" ON auktivo_dev.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON auktivo_dev.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- properties: Jeder kann lesen (Basisdaten oeffentlich)
CREATE POLICY "properties_select_all" ON auktivo_dev.properties
  FOR SELECT USING (true);

-- property_documents: Service-Role (Server-side only)
CREATE POLICY "documents_service_only" ON auktivo_dev.property_documents
  FOR ALL USING (auth.role() = 'service_role');

-- property_analyses: Service-Role (Plan-Check erfolgt in API-Route)
CREATE POLICY "analyses_service_only" ON auktivo_dev.property_analyses
  FOR ALL USING (auth.role() = 'service_role');

-- chat_sessions: Eigene Sitzungen
CREATE POLICY "chat_select_own" ON auktivo_dev.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "chat_insert_own" ON auktivo_dev.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_update_own" ON auktivo_dev.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- favorites: Eigene Favoriten
CREATE POLICY "favorites_select_own" ON auktivo_dev.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own" ON auktivo_dev.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own" ON auktivo_dev.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- search_alerts: Eigene Alarme
CREATE POLICY "alerts_select_own" ON auktivo_dev.search_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "alerts_insert_own" ON auktivo_dev.search_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alerts_update_own" ON auktivo_dev.search_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "alerts_delete_own" ON auktivo_dev.search_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- push_subscriptions: Eigene Subscriptions
CREATE POLICY "push_select_own" ON auktivo_dev.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_insert_own" ON auktivo_dev.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_delete_own" ON auktivo_dev.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- crawler_runs: Nur Admins
CREATE POLICY "crawler_admin_only" ON auktivo_dev.crawler_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auktivo_dev.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =============================================================
-- DATABASE FUNCTIONS
-- =============================================================

-- Trigger: profiles bei neuem Auth-User erstellen
CREATE OR REPLACE FUNCTION auktivo_dev.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = auktivo_dev, public
AS $$
BEGIN
  INSERT INTO auktivo_dev.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auktivo_dev.handle_new_user();

-- Monatlichen Such-Zaehler pruefen und incrementieren
CREATE OR REPLACE FUNCTION auktivo_dev.increment_search_count(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = auktivo_dev, public
AS $$
DECLARE
  v_profile   auktivo_dev.profiles%ROWTYPE;
  v_now       timestamptz := now();
  v_limit     integer := 5;
  v_remaining integer;
BEGIN
  SELECT * INTO v_profile FROM auktivo_dev.profiles WHERE id = p_user_id;

  -- Pro-Nutzer haben kein Limit
  IF v_profile.plan = 'pro' THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', -1);
  END IF;

  -- Monatlichen Reset pruefen
  IF date_trunc('month', v_profile.monthly_search_reset_at) < date_trunc('month', v_now) THEN
    UPDATE auktivo_dev.profiles
    SET monthly_search_count = 1,
        monthly_search_reset_at = v_now,
        updated_at = v_now
    WHERE id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'remaining', v_limit - 1);
  END IF;

  -- Limit pruefen
  IF v_profile.monthly_search_count >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0);
  END IF;

  -- Zaehler erhoehen
  UPDATE auktivo_dev.profiles
  SET monthly_search_count = monthly_search_count + 1,
      updated_at = v_now
  WHERE id = p_user_id;

  v_remaining := v_limit - (v_profile.monthly_search_count + 1);
  RETURN jsonb_build_object('allowed', true, 'remaining', v_remaining);
END;
$$;

-- updated_at automatisch setzen
CREATE OR REPLACE FUNCTION auktivo_dev.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON auktivo_dev.profiles
  FOR EACH ROW EXECUTE FUNCTION auktivo_dev.set_updated_at();

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON auktivo_dev.properties
  FOR EACH ROW EXECUTE FUNCTION auktivo_dev.set_updated_at();

CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON auktivo_dev.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION auktivo_dev.set_updated_at();
