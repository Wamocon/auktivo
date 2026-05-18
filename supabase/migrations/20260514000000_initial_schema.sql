-- =============================================================
-- Auktivo - Vollstaendige Initial-Migration (idempotent)
-- Enthaelt: 3 Schemas, Grants, alle Tabellen, RLS-Policies,
--           Funktionen, Trigger und Admin-User
--
-- Ausfuehren (lokale Supabase):
--   docker cp supabase/migrations/20260514000000_initial_schema.sql \
--     supabase_db_auktivo:/tmp/migration.sql
--   docker exec supabase_db_auktivo psql -U postgres -d postgres \
--     -f /tmp/migration.sql
-- =============================================================

-- =============================================================
-- 1. SCHEMAS ANLEGEN
-- =============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auktivo_dev')  THEN CREATE SCHEMA auktivo_dev;  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auktivo_test') THEN CREATE SCHEMA auktivo_test; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auktivo_prod') THEN CREATE SCHEMA auktivo_prod; END IF;
END $$;

-- =============================================================
-- 2. GRANTS (PostgREST-Rollen Zugriff auf alle Schemas)
-- =============================================================
DO $grants$ DECLARE s text; BEGIN
  FOREACH s IN ARRAY ARRAY['auktivo_dev','auktivo_test','auktivo_prod'] LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role', s);
    EXECUTE format('GRANT ALL ON ALL TABLES    IN SCHEMA %I TO anon, authenticated, service_role', s);
    EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO anon, authenticated, service_role', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES    TO anon, authenticated, service_role', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO anon, authenticated, service_role', s);
  END LOOP;
END $grants$;

-- =============================================================
-- 2b. POSTGREST-ROLLENKONFIGURATION
--     pgrst.db_schemas wird als Rollen-GUC gesetzt und hat
--     hoehere Prioritaet als die PGRST_DB_SCHEMAS env-Variable.
--     Muss Unterstriche verwenden (keine Bindestriche).
-- =============================================================
ALTER ROLE authenticator SET "pgrst.db_schemas" =
  'public,graphql_public,auktivo_dev,auktivo_test,auktivo_prod';

-- =============================================================
-- 3. TABELLEN, INDIZES, RLS, POLICIES, FUNKTIONEN, TRIGGER
--    (Schleife ueber alle drei Schemas)
--    s_safe = Schema-Name mit Unterstrichen (fuer Index-Namen)
-- =============================================================
DO $setup$
DECLARE
  schemas TEXT[] := ARRAY['auktivo_dev', 'auktivo_test', 'auktivo_prod'];
  s      TEXT;
  s_safe TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    s_safe := replace(s, '-', '_');

    -- ---------------------------------------------------------
    -- PROFILES (erweitert auth.users)
    -- ---------------------------------------------------------
    EXECUTE format($t$
      CREATE TABLE IF NOT EXISTS %I.profiles (
        id                      uuid          REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        email                   text          NOT NULL,
        full_name               text,
        plan                    text          NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
        is_admin                boolean       NOT NULL DEFAULT false,
        user_type               text          NOT NULL DEFAULT 'private' CHECK (user_type IN ('private','business')),
        phone                   text,
        company_name            text,
        email_notifications     boolean       NOT NULL DEFAULT true,
        stripe_customer_id      text UNIQUE,
        stripe_subscription_id  text UNIQUE,
        subscription_status     text,
        monthly_search_count    integer       NOT NULL DEFAULT 0,
        monthly_search_reset_at timestamptz   NOT NULL DEFAULT now(),
        created_at              timestamptz   NOT NULL DEFAULT now(),
        updated_at              timestamptz   NOT NULL DEFAULT now()
      )
    $t$, s);

    -- ---------------------------------------------------------
    -- PROPERTIES (Zwangsversteigerungsobjekte vom ZVG-Crawler)
    -- ---------------------------------------------------------
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

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_props_zip    ON %I.properties(zip_code)',       s_safe, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_props_date   ON %I.properties(auction_date)',   s_safe, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_props_status ON %I.properties(status)',         s_safe, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_props_type   ON %I.properties(property_type)', s_safe, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_props_value  ON %I.properties(market_value)',   s_safe, s);

    -- ---------------------------------------------------------
    -- PROPERTY_DOCUMENTS (OCR-Ergebnisse)
    -- ---------------------------------------------------------
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

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_docs_prop   ON %I.property_documents(property_id)', s_safe, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_docs_status ON %I.property_documents(ocr_status)',  s_safe, s);

    -- ---------------------------------------------------------
    -- PROPERTY_ANALYSES (KI-Risikoanalysen)
    -- ---------------------------------------------------------
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

    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS idx_%s_anal_prop ON %I.property_analyses(property_id)', s_safe, s);
    EXECUTE format('CREATE INDEX        IF NOT EXISTS idx_%s_anal_risk ON %I.property_analyses(risk_level)',  s_safe, s);

    -- ---------------------------------------------------------
    -- CHAT_SESSIONS (KI-Chat pro Objekt und Nutzer)
    -- ---------------------------------------------------------
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

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_chat_user ON %I.chat_sessions(user_id)', s_safe, s);

    -- ---------------------------------------------------------
    -- FAVORITES (Pro-Feature)
    -- ---------------------------------------------------------
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

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_fav_user ON %I.favorites(user_id)', s_safe, s);

    -- ---------------------------------------------------------
    -- SEARCH_ALERTS (Pro-Feature)
    -- ---------------------------------------------------------
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

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_alert_user   ON %I.search_alerts(user_id)',   s_safe, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_alert_active ON %I.search_alerts(is_active)', s_safe, s);

    -- ---------------------------------------------------------
    -- PUSH_SUBSCRIPTIONS (Web Push)
    -- ---------------------------------------------------------
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

    -- ---------------------------------------------------------
    -- CRAWLER_RUNS (Admin-Monitoring)
    -- ---------------------------------------------------------
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

    -- ---------------------------------------------------------
    -- RLS AKTIVIEREN
    -- ---------------------------------------------------------
    EXECUTE format('ALTER TABLE %I.profiles           ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.properties         ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.property_documents ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.property_analyses  ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.chat_sessions      ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.favorites          ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.search_alerts      ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.push_subscriptions ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %I.crawler_runs       ENABLE ROW LEVEL SECURITY', s);

    -- ---------------------------------------------------------
    -- RLS POLICIES
    -- ---------------------------------------------------------
    EXECUTE format('DROP POLICY IF EXISTS profiles_select_own ON %I.profiles', s);
    EXECUTE format('CREATE POLICY profiles_select_own ON %I.profiles FOR SELECT USING (auth.uid() = id)', s);
    EXECUTE format('DROP POLICY IF EXISTS profiles_update_own ON %I.profiles', s);
    EXECUTE format('CREATE POLICY profiles_update_own ON %I.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)', s);

    EXECUTE format('DROP POLICY IF EXISTS properties_select_all ON %I.properties', s);
    EXECUTE format('CREATE POLICY properties_select_all ON %I.properties FOR SELECT USING (true)', s);

    EXECUTE format('DROP POLICY IF EXISTS documents_service_only ON %I.property_documents', s);
    EXECUTE format('CREATE POLICY documents_service_only ON %I.property_documents FOR ALL USING (auth.role() = ''service_role'')', s);

    EXECUTE format('DROP POLICY IF EXISTS analyses_service_only ON %I.property_analyses', s);
    EXECUTE format('CREATE POLICY analyses_service_only ON %I.property_analyses FOR ALL USING (auth.role() = ''service_role'')', s);

    EXECUTE format('DROP POLICY IF EXISTS chat_select_own ON %I.chat_sessions', s);
    EXECUTE format('CREATE POLICY chat_select_own ON %I.chat_sessions FOR SELECT USING (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS chat_insert_own ON %I.chat_sessions', s);
    EXECUTE format('CREATE POLICY chat_insert_own ON %I.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS chat_update_own ON %I.chat_sessions', s);
    EXECUTE format('CREATE POLICY chat_update_own ON %I.chat_sessions FOR UPDATE USING (auth.uid() = user_id)', s);

    EXECUTE format('DROP POLICY IF EXISTS favorites_select_own ON %I.favorites', s);
    EXECUTE format('CREATE POLICY favorites_select_own ON %I.favorites FOR SELECT USING (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS favorites_insert_own ON %I.favorites', s);
    EXECUTE format('CREATE POLICY favorites_insert_own ON %I.favorites FOR INSERT WITH CHECK (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS favorites_delete_own ON %I.favorites', s);
    EXECUTE format('CREATE POLICY favorites_delete_own ON %I.favorites FOR DELETE USING (auth.uid() = user_id)', s);

    EXECUTE format('DROP POLICY IF EXISTS alerts_select_own ON %I.search_alerts', s);
    EXECUTE format('CREATE POLICY alerts_select_own ON %I.search_alerts FOR SELECT USING (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS alerts_insert_own ON %I.search_alerts', s);
    EXECUTE format('CREATE POLICY alerts_insert_own ON %I.search_alerts FOR INSERT WITH CHECK (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS alerts_update_own ON %I.search_alerts', s);
    EXECUTE format('CREATE POLICY alerts_update_own ON %I.search_alerts FOR UPDATE USING (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS alerts_delete_own ON %I.search_alerts', s);
    EXECUTE format('CREATE POLICY alerts_delete_own ON %I.search_alerts FOR DELETE USING (auth.uid() = user_id)', s);

    EXECUTE format('DROP POLICY IF EXISTS push_select_own ON %I.push_subscriptions', s);
    EXECUTE format('CREATE POLICY push_select_own ON %I.push_subscriptions FOR SELECT USING (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS push_insert_own ON %I.push_subscriptions', s);
    EXECUTE format('CREATE POLICY push_insert_own ON %I.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id)', s);
    EXECUTE format('DROP POLICY IF EXISTS push_delete_own ON %I.push_subscriptions', s);
    EXECUTE format('CREATE POLICY push_delete_own ON %I.push_subscriptions FOR DELETE USING (auth.uid() = user_id)', s);

    EXECUTE format($pol$
      DROP POLICY IF EXISTS crawler_admin_only ON %I.crawler_runs;
      CREATE POLICY crawler_admin_only ON %I.crawler_runs FOR ALL
        USING (EXISTS (SELECT 1 FROM %I.profiles WHERE id = auth.uid() AND is_admin = true))
    $pol$, s, s, s);

    -- ---------------------------------------------------------
    -- FUNKTIONEN
    -- ---------------------------------------------------------
    EXECUTE format($fn$
      CREATE OR REPLACE FUNCTION %I.handle_new_user()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
      SET search_path = %I, public AS $$
      BEGIN
        INSERT INTO %I.profiles (id, email, full_name)
        VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name',''))
        ON CONFLICT (id) DO NOTHING;
        RETURN new;
      END; $$
    $fn$, s, s, s);

    EXECUTE format($fn$
      CREATE OR REPLACE FUNCTION %I.set_updated_at()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
    $fn$, s);

    EXECUTE format($fn$
      CREATE OR REPLACE FUNCTION %I.increment_search_count(p_user_id uuid)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
      SET search_path = %I, public AS $$
      DECLARE
        v_profile %I.profiles%%ROWTYPE;
        v_now     timestamptz := now();
        v_limit   integer := 5;
      BEGIN
        SELECT * INTO v_profile FROM %I.profiles WHERE id = p_user_id;
        IF v_profile.plan = 'pro' THEN
          RETURN jsonb_build_object('allowed',true,'remaining',-1);
        END IF;
        IF date_trunc('month',v_profile.monthly_search_reset_at) < date_trunc('month',v_now) THEN
          UPDATE %I.profiles SET monthly_search_count=1, monthly_search_reset_at=v_now, updated_at=v_now WHERE id=p_user_id;
          RETURN jsonb_build_object('allowed',true,'remaining',v_limit-1);
        END IF;
        IF v_profile.monthly_search_count >= v_limit THEN
          RETURN jsonb_build_object('allowed',false,'remaining',0);
        END IF;
        UPDATE %I.profiles SET monthly_search_count=monthly_search_count+1, updated_at=v_now WHERE id=p_user_id;
        RETURN jsonb_build_object('allowed',true,'remaining',v_limit-(v_profile.monthly_search_count+1));
      END; $$
    $fn$, s, s, s, s, s, s);

    -- ---------------------------------------------------------
    -- TRIGGER
    -- ---------------------------------------------------------
    EXECUTE format('DROP TRIGGER IF EXISTS profiles_updated_at ON %I.profiles', s);
    EXECUTE format('CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON %I.profiles FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', s, s);

    EXECUTE format('DROP TRIGGER IF EXISTS properties_updated_at ON %I.properties', s);
    EXECUTE format('CREATE TRIGGER properties_updated_at BEFORE UPDATE ON %I.properties FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', s, s);

    EXECUTE format('DROP TRIGGER IF EXISTS chat_sessions_updated_at ON %I.chat_sessions', s);
    EXECUTE format('CREATE TRIGGER chat_sessions_updated_at BEFORE UPDATE ON %I.chat_sessions FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', s, s);

    RAISE NOTICE 'Schema "%" vollstaendig eingerichtet.', s;
  END LOOP;
END $setup$;

-- =============================================================
-- 4. AUTH-TRIGGER (einmal, zeigt auf auktivo_dev)
-- =============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auktivo_dev.handle_new_user();

-- =============================================================
-- 5. ADMIN-USER: nikolaj.schefner@wamocon.com
--    Passwort: !Frankfurt1988 (bcrypt in DB gespeichert)
-- =============================================================

-- 5a) User in auth.users (GoTrue-Pflichtfelder vollstaendig)
INSERT INTO auth.users (
  id, email, email_confirmed_at, created_at, updated_at,
  aud, role, instance_id,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change, phone
)
VALUES (
  '76b60d81-4443-4995-9b5b-7d31fdf0a67c',
  'nikolaj.schefner@wamocon.com',
  now(), now(), now(),
  'authenticated', 'authenticated',
  '00000000-0000-0000-0000-000000000000',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Nikolaj Schefner"}',
  '', '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- 5b) Passwort (bcrypt, Kostenfaktor 10)
UPDATE auth.users
SET
  encrypted_password     = crypt('!Frankfurt1988', gen_salt('bf', 10)),
  aud                    = 'authenticated',
  role                   = 'authenticated',
  instance_id            = '00000000-0000-0000-0000-000000000000',
  confirmation_token     = COALESCE(confirmation_token, ''),
  recovery_token         = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change           = COALESCE(email_change, ''),
  phone                  = COALESCE(phone, ''),
  updated_at             = now()
WHERE email = 'nikolaj.schefner@wamocon.com';

-- 5c) Identity fuer Email-Provider
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  '76b60d81-4443-4995-9b5b-7d31fdf0a67c',
  'nikolaj.schefner@wamocon.com',
  'email',
  '{"sub":"76b60d81-4443-4995-9b5b-7d31fdf0a67c","email":"nikolaj.schefner@wamocon.com","email_verified":true}',
  now(), now(), now()
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 5d) Admin-Profil in auktivo_dev und auktivo_test
INSERT INTO auktivo_dev.profiles (id, email, full_name, plan, is_admin)
VALUES ('76b60d81-4443-4995-9b5b-7d31fdf0a67c','nikolaj.schefner@wamocon.com','Nikolaj Schefner','pro',true)
ON CONFLICT (id) DO UPDATE SET plan='pro', is_admin=true;

INSERT INTO auktivo_test.profiles (id, email, full_name, plan, is_admin)
VALUES ('76b60d81-4443-4995-9b5b-7d31fdf0a67c','nikolaj.schefner@wamocon.com','Nikolaj Schefner','pro',true)
ON CONFLICT (id) DO UPDATE SET plan='pro', is_admin=true;

-- =============================================================
-- 6. ABSCHLUSSBERICHT
-- =============================================================
DO $$
DECLARE
  schema_count integer;
  table_count  integer;
BEGIN
  SELECT COUNT(*) INTO schema_count FROM pg_namespace WHERE nspname IN ('auktivo_dev','auktivo_test','auktivo_prod');
  SELECT COUNT(*) INTO table_count  FROM information_schema.tables WHERE table_schema IN ('auktivo_dev','auktivo_test','auktivo_prod');
  RAISE NOTICE '=== Migration abgeschlossen ===';
  RAISE NOTICE 'Schemas angelegt: %', schema_count;
  RAISE NOTICE 'Tabellen gesamt:  %', table_count;
  RAISE NOTICE 'Admin-User:       nikolaj.schefner@wamocon.com (plan=pro, is_admin=true)';
END $$;
