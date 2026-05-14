-- =============================================================
-- Auktivo - Vollstaendiges 3-Schema Setup
-- Schemas: auktivo_dev | auktivo_test | auktivo_prod
-- Ausfuehren: docker exec -i supabase_db_auktivo psql -U postgres -d postgres -f /tmp/setup_all_schemas.sql
-- =============================================================

-- 1. ALLE DREI SCHEMAS ANLEGEN
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auktivo_dev')  THEN CREATE SCHEMA auktivo_dev;  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auktivo_test') THEN CREATE SCHEMA auktivo_test; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auktivo_prod') THEN CREATE SCHEMA auktivo_prod; END IF;
END $$;

-- =============================================================
-- MACRO: Tabellen, Indizes, RLS, Policies, Funktionen und Trigger
--        fuer ein einzelnes Schema erstellen
-- Wird fuer jedes Schema einmal aufgerufen
-- =============================================================

DO $setup$
DECLARE
  schemas TEXT[] := ARRAY['auktivo_dev', 'auktivo_test', 'auktivo_prod'];
  s TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP

    -- -------------------------------------------------------
    -- PROFILES
    -- -------------------------------------------------------
    EXECUTE format($t$
      CREATE TABLE IF NOT EXISTS %I.profiles (
        id                      uuid          REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        email                   text          NOT NULL,
        full_name               text,
        plan                    text          NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
        is_admin                boolean       NOT NULL DEFAULT false,
        stripe_customer_id      text UNIQUE,
        stripe_subscription_id  text UNIQUE,
        subscription_status     text,
        monthly_search_count    integer       NOT NULL DEFAULT 0,
        monthly_search_reset_at timestamptz   NOT NULL DEFAULT now(),
        created_at              timestamptz   NOT NULL DEFAULT now(),
        updated_at              timestamptz   NOT NULL DEFAULT now()
      )
    $t$, s);

    -- -------------------------------------------------------
    -- PROPERTIES
    -- -------------------------------------------------------
    EXECUTE format($t$
      CREATE TABLE IF NOT EXISTS %I.properties (
        id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        zvg_id            text        UNIQUE NOT NULL,
        court             text        NOT NULL,
        court_file_number text,
        auction_date      timestamptz,
        property_type     text        CHECK (property_type IN ('house','apartment','commercial','land','other')),
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
        status            text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','withdrawn','sold')),
        last_crawled_at   timestamptz,
        created_at        timestamptz NOT NULL DEFAULT now(),
        updated_at        timestamptz NOT NULL DEFAULT now()
      )
    $t$, s);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_props_zip    ON %I.properties(zip_code)',      s, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_props_date   ON %I.properties(auction_date)',  s, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_props_status ON %I.properties(status)',        s, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_props_type   ON %I.properties(property_type)',s, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_props_value  ON %I.properties(market_value)', s, s);

    -- -------------------------------------------------------
    -- PROPERTY_DOCUMENTS
    -- -------------------------------------------------------
    EXECUTE format($t$
      CREATE TABLE IF NOT EXISTS %I.property_documents (
        id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id     uuid        NOT NULL REFERENCES %I.properties(id) ON DELETE CASCADE,
        original_url    text        NOT NULL,
        document_type   text        CHECK (document_type IN ('gutachten','beschluss','sonstig')),
        ocr_text        text,
        ocr_status      text        NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending','processing','done','failed')),
        ocr_confidence  numeric(5,2),
        file_size_bytes integer,
        page_count      integer,
        processed_at    timestamptz,
        created_at      timestamptz NOT NULL DEFAULT now()
      )
    $t$, s, s);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_docs_prop   ON %I.property_documents(property_id)', s, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_docs_status ON %I.property_documents(ocr_status)',  s, s);

    -- -------------------------------------------------------
    -- PROPERTY_ANALYSES
    -- -------------------------------------------------------
    EXECUTE format($t$
      CREATE TABLE IF NOT EXISTS %I.property_analyses (
        id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id     uuid        NOT NULL REFERENCES %I.properties(id) ON DELETE CASCADE,
        risk_level      text        CHECK (risk_level IN ('low','medium','high','critical')),
        risk_signals    jsonb       NOT NULL DEFAULT '{}',
        summary         text,
        analysis_model  text,
        prompt_version  text        NOT NULL DEFAULT 'v1.0',
        analysis_status text        NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending','processing','done','failed')),
        error_message   text,
        analyzed_at     timestamptz,
        created_at      timestamptz NOT NULL DEFAULT now()
      )
    $t$, s, s);

    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS idx_%s_anal_prop  ON %I.property_analyses(property_id)', s, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS        idx_%s_anal_risk  ON %I.property_analyses(risk_level)',  s, s);

    -- -------------------------------------------------------
    -- CHAT_SESSIONS
    -- -------------------------------------------------------
    EXECUTE format($t$
      CREATE TABLE IF NOT EXISTS %I.chat_sessions (
        id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        property_id uuid        NOT NULL REFERENCES %I.properties(id) ON DELETE CASCADE,
        messages    jsonb       NOT NULL DEFAULT '[]',
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, property_id)
      )
    $t$, s, s);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_chat_user ON %I.chat_sessions(user_id)', s, s);

    -- -------------------------------------------------------
    -- FAVORITES
    -- -------------------------------------------------------
    EXECUTE format($t$
      CREATE TABLE IF NOT EXISTS %I.favorites (
        id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        property_id uuid        NOT NULL REFERENCES %I.properties(id) ON DELETE CASCADE,
        notes       text,
        created_at  timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, property_id)
      )
    $t$, s, s);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_fav_user ON %I.favorites(user_id)', s, s);

    -- -------------------------------------------------------
    -- SEARCH_ALERTS
    -- -------------------------------------------------------
    EXECUTE format($t$
      CREATE TABLE IF NOT EXISTS %I.search_alerts (
        id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name                text        NOT NULL DEFAULT 'Suchalarm',
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
      )
    $t$, s);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_alert_user   ON %I.search_alerts(user_id)',   s, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_alert_active ON %I.search_alerts(is_active)', s, s);

    -- -------------------------------------------------------
    -- PUSH_SUBSCRIPTIONS
    -- -------------------------------------------------------
    EXECUTE format($t$
      CREATE TABLE IF NOT EXISTS %I.push_subscriptions (
        id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        endpoint   text        NOT NULL UNIQUE,
        p256dh     text        NOT NULL,
        auth       text        NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    $t$, s);

    -- -------------------------------------------------------
    -- CRAWLER_RUNS
    -- -------------------------------------------------------
    EXECUTE format($t$
      CREATE TABLE IF NOT EXISTS %I.crawler_runs (
        id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        started_at               timestamptz NOT NULL DEFAULT now(),
        finished_at              timestamptz,
        status                   text        NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
        properties_found         integer     NOT NULL DEFAULT 0,
        new_properties_count     integer     NOT NULL DEFAULT 0,
        updated_properties_count integer     NOT NULL DEFAULT 0,
        failed_urls              text[]      NOT NULL DEFAULT '{}',
        error_message            text
      )
    $t$, s);

    -- -------------------------------------------------------
    -- RLS AKTIVIEREN
    -- -------------------------------------------------------
    EXECUTE format('ALTER TABLE %I.profiles           ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.properties         ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.property_documents ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.property_analyses  ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.chat_sessions      ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.favorites          ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.search_alerts      ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.push_subscriptions ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.crawler_runs       ENABLE ROW LEVEL SECURITY', s);

    -- -------------------------------------------------------
    -- RLS POLICIES
    -- -------------------------------------------------------
    -- Profiles
    EXECUTE format('DROP POLICY IF EXISTS profiles_select_own ON %I.profiles', s);
    EXECUTE format('CREATE POLICY profiles_select_own ON %I.profiles FOR SELECT USING (auth.uid() = id)', s);
    EXECUTE format('DROP POLICY IF EXISTS profiles_update_own ON %I.profiles', s);
    EXECUTE format('CREATE POLICY profiles_update_own ON %I.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)', s);

    -- Properties (public read)
    EXECUTE format('DROP POLICY IF EXISTS properties_select_all ON %I.properties', s);
    EXECUTE format('CREATE POLICY properties_select_all ON %I.properties FOR SELECT USING (true)', s);

    -- Documents: service_role only
    EXECUTE format('DROP POLICY IF EXISTS documents_service_only ON %I.property_documents', s);
    EXECUTE format('CREATE POLICY documents_service_only ON %I.property_documents FOR ALL USING (auth.role() = ''service_role'')', s);

    -- Analyses: service_role only
    EXECUTE format('DROP POLICY IF EXISTS analyses_service_only ON %I.property_analyses', s);
    EXECUTE format('CREATE POLICY analyses_service_only ON %I.property_analyses FOR ALL USING (auth.role() = ''service_role'')', s);

    -- Chat sessions
    EXECUTE format('DROP POLICY IF EXISTS chat_select_own ON %I.chat_sessions', s);
    EXECUTE format('CREATE POLICY chat_select_own ON %I.chat_sessions FOR SELECT USING (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS chat_insert_own ON %I.chat_sessions', s);
    EXECUTE format('CREATE POLICY chat_insert_own ON %I.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS chat_update_own ON %I.chat_sessions', s);
    EXECUTE format('CREATE POLICY chat_update_own ON %I.chat_sessions FOR UPDATE USING (auth.uid() = user_id)', s);

    -- Favorites
    EXECUTE format('DROP POLICY IF EXISTS favorites_select_own ON %I.favorites', s);
    EXECUTE format('CREATE POLICY favorites_select_own ON %I.favorites FOR SELECT USING (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS favorites_insert_own ON %I.favorites', s);
    EXECUTE format('CREATE POLICY favorites_insert_own ON %I.favorites FOR INSERT WITH CHECK (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS favorites_delete_own ON %I.favorites', s);
    EXECUTE format('CREATE POLICY favorites_delete_own ON %I.favorites FOR DELETE USING (auth.uid() = user_id)', s);

    -- Search alerts
    EXECUTE format('DROP POLICY IF EXISTS alerts_select_own ON %I.search_alerts', s);
    EXECUTE format('CREATE POLICY alerts_select_own ON %I.search_alerts FOR SELECT USING (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS alerts_insert_own ON %I.search_alerts', s);
    EXECUTE format('CREATE POLICY alerts_insert_own ON %I.search_alerts FOR INSERT WITH CHECK (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS alerts_update_own ON %I.search_alerts', s);
    EXECUTE format('CREATE POLICY alerts_update_own ON %I.search_alerts FOR UPDATE USING (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS alerts_delete_own ON %I.search_alerts', s);
    EXECUTE format('CREATE POLICY alerts_delete_own ON %I.search_alerts FOR DELETE USING (auth.uid() = user_id)', s);

    -- Push subscriptions
    EXECUTE format('DROP POLICY IF EXISTS push_select_own ON %I.push_subscriptions', s);
    EXECUTE format('CREATE POLICY push_select_own ON %I.push_subscriptions FOR SELECT USING (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS push_insert_own ON %I.push_subscriptions', s);
    EXECUTE format('CREATE POLICY push_insert_own ON %I.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS push_delete_own ON %I.push_subscriptions', s);
    EXECUTE format('CREATE POLICY push_delete_own ON %I.push_subscriptions FOR DELETE USING (auth.uid() = user_id)', s);

    -- Crawler runs: admins only
    EXECUTE format($pol$
      DROP POLICY IF EXISTS crawler_admin_only ON %I.crawler_runs;
      CREATE POLICY crawler_admin_only ON %I.crawler_runs FOR ALL
        USING (EXISTS (SELECT 1 FROM %I.profiles WHERE id = auth.uid() AND is_admin = true))
    $pol$, s, s, s);

    -- -------------------------------------------------------
    -- FUNCTIONS + TRIGGERS
    -- -------------------------------------------------------

    -- handle_new_user: Profil bei Registrierung anlegen
    EXECUTE format($fn$
      CREATE OR REPLACE FUNCTION %I.handle_new_user()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = %I, public AS $$
      BEGIN
        INSERT INTO %I.profiles (id, email, full_name)
        VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''))
        ON CONFLICT (id) DO NOTHING;
        RETURN new;
      END; $$
    $fn$, s, s, s);

    -- set_updated_at: Trigger-Funktion
    EXECUTE format($fn$
      CREATE OR REPLACE FUNCTION %I.set_updated_at()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
    $fn$, s);

    -- increment_search_count: Atomare Suche-Zaehlung
    EXECUTE format($fn$
      CREATE OR REPLACE FUNCTION %I.increment_search_count(p_user_id uuid)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = %I, public AS $$
      DECLARE
        v_profile %I.profiles%%ROWTYPE;
        v_now     timestamptz := now();
        v_limit   integer := 5;
      BEGIN
        SELECT * INTO v_profile FROM %I.profiles WHERE id = p_user_id;
        IF v_profile.plan = 'pro' THEN
          RETURN jsonb_build_object('allowed', true, 'remaining', -1);
        END IF;
        IF date_trunc('month', v_profile.monthly_search_reset_at) < date_trunc('month', v_now) THEN
          UPDATE %I.profiles SET monthly_search_count = 1, monthly_search_reset_at = v_now, updated_at = v_now WHERE id = p_user_id;
          RETURN jsonb_build_object('allowed', true, 'remaining', v_limit - 1);
        END IF;
        IF v_profile.monthly_search_count >= v_limit THEN
          RETURN jsonb_build_object('allowed', false, 'remaining', 0);
        END IF;
        UPDATE %I.profiles SET monthly_search_count = monthly_search_count + 1, updated_at = v_now WHERE id = p_user_id;
        RETURN jsonb_build_object('allowed', true, 'remaining', v_limit - (v_profile.monthly_search_count + 1));
      END; $$
    $fn$, s, s, s, s, s, s);

    -- Trigger: updated_at setzen
    EXECUTE format('DROP TRIGGER IF EXISTS profiles_updated_at ON %I.profiles', s);
    EXECUTE format('CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON %I.profiles FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', s, s);

    EXECUTE format('DROP TRIGGER IF EXISTS properties_updated_at ON %I.properties', s);
    EXECUTE format('CREATE TRIGGER properties_updated_at BEFORE UPDATE ON %I.properties FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', s, s);

    EXECUTE format('DROP TRIGGER IF EXISTS chat_sessions_updated_at ON %I.chat_sessions', s);
    EXECUTE format('CREATE TRIGGER chat_sessions_updated_at BEFORE UPDATE ON %I.chat_sessions FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', s, s);

    RAISE NOTICE 'Schema % vollstaendig eingerichtet.', s;
  END LOOP;
END $setup$;

-- Auth-Trigger nur einmal (fuer auktivo_dev, da lokal immer dev)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auktivo_dev.handle_new_user();

-- =============================================================
-- SEED-DATEN (nur auktivo_dev, lokal)
-- =============================================================
SET search_path TO auktivo_dev, public;

INSERT INTO auktivo_dev.properties (
  zvg_id, court, court_file_number, auction_date, property_type,
  address, city, zip_code, state, lat, lng,
  market_value, minimum_bid, document_urls, status
) VALUES
(
  'DEV-2026-001', 'Amtsgericht Muenchen', 'XIV 12/2026',
  now() + interval '14 days', 'apartment',
  'Maximilianstrasse 42', 'Muenchen', '80539', 'Bayern',
  48.1399, 11.5784, 385000, 192500,
  ARRAY['https://example.com/gutachten-001.pdf'], 'active'
),
(
  'DEV-2026-002', 'Amtsgericht Berlin-Mitte', 'XIV 8/2026',
  now() + interval '21 days', 'house',
  'Prenzlauer Allee 112', 'Berlin', '10409', 'Berlin',
  52.5387, 13.4244, 520000, 260000,
  ARRAY['https://example.com/gutachten-002.pdf'], 'active'
),
(
  'DEV-2026-003', 'Amtsgericht Hamburg', 'XIV 15/2026',
  now() + interval '7 days', 'commercial',
  'Hafenstrasse 22', 'Hamburg', '20459', 'Hamburg',
  53.5462, 9.9801, 890000, 445000,
  ARRAY['https://example.com/gutachten-003.pdf'], 'active'
),
(
  'DEV-2026-004', 'Amtsgericht Frankfurt am Main', 'XIV 3/2026',
  now() + interval '35 days', 'apartment',
  'Sachsenhaeuser Ufer 18', 'Frankfurt am Main', '60594', 'Hessen',
  50.0993, 8.6849, 275000, 137500,
  ARRAY['https://example.com/gutachten-004.pdf'], 'active'
),
(
  'DEV-2026-005', 'Amtsgericht Koeln', 'XIV 22/2026',
  now() + interval '28 days', 'house',
  'Rheinauhafen 7', 'Koeln', '50678', 'Nordrhein-Westfalen',
  50.9285, 6.9575, 640000, 320000,
  ARRAY['https://example.com/gutachten-005.pdf'], 'active'
)
ON CONFLICT (zvg_id) DO NOTHING;

-- Beispiel-Analysen fuer Properties einfuegen
INSERT INTO auktivo_dev.property_analyses (property_id, risk_level, summary, analysis_status, analyzed_at, risk_signals)
SELECT
  p.id,
  CASE row_number() OVER (ORDER BY p.zvg_id)
    WHEN 1 THEN 'low'
    WHEN 2 THEN 'medium'
    WHEN 3 THEN 'high'
    WHEN 4 THEN 'low'
    WHEN 5 THEN 'critical'
  END::text,
  CASE row_number() OVER (ORDER BY p.zvg_id)
    WHEN 1 THEN 'Gut erhaltene Wohnung in Toplage. Geringe Belastungen im Grundbuch, kein Sanierungsbedarf ersichtlich.'
    WHEN 2 THEN 'Sanierungsbedarf im Badezimmer (ca. 15.000-25.000 EUR). Grundschuld zugunsten Sparkasse eingetragen.'
    WHEN 3 THEN 'Gewerbeobjekt mit Altlastenverdacht. Mietvertrag laeuft noch 4 Jahre. Erhebliche Baulast eingetragen.'
    WHEN 4 THEN 'Solide Wohnung mit kleinem Balkon. Keine besonderen Risiken festgestellt.'
    WHEN 5 THEN 'Erhebliche Maengel: Schimmelbefall, veraltete Elektrik, zwei Grundschulden. Hoher Sanierungsbedarf.'
  END,
  'done',
  now() - interval '1 hour',
  '{"baulasten":[],"sanierungsbedarf":[],"mietverhaeltnisse":[],"grundbuchbelastungen":[],"positive_signals":[]}'::jsonb
FROM auktivo_dev.properties p
ON CONFLICT (property_id) DO NOTHING;

-- Abschlussmeldung
DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Auktivo DB Setup abgeschlossen ===';
  RAISE NOTICE 'Schemas: auktivo_dev, auktivo_test, auktivo_prod';
  RAISE NOTICE 'Tabellen: profiles, properties, property_documents, property_analyses,';
  RAISE NOTICE '          chat_sessions, favorites, search_alerts, push_subscriptions, crawler_runs';
  RAISE NOTICE 'Seed: 5 Properties + 5 Analysen in auktivo_dev';
END $$;
