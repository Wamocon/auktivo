-- Migration: AI Recommendation Sessions
-- Speichert Nutzer-Praeferenzen und Ergebnisse fuer Empfehlungs-Sessions

CREATE TABLE IF NOT EXISTS auktivo_dev.ai_recommendation_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auktivo_dev.profiles(id) ON DELETE CASCADE,
  preferences_json jsonb NOT NULL DEFAULT '{}',
  results_json     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_recommendation_sessions_user_id_idx
  ON auktivo_dev.ai_recommendation_sessions (user_id, created_at DESC);

-- RLS aktivieren
ALTER TABLE auktivo_dev.ai_recommendation_sessions ENABLE ROW LEVEL SECURITY;

-- Nutzer sieht nur eigene Sessions
CREATE POLICY "user_own_recommendation_sessions"
  ON auktivo_dev.ai_recommendation_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auch fuer Test- und Prod-Schema
CREATE TABLE IF NOT EXISTS auktivo_test.ai_recommendation_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auktivo_test.profiles(id) ON DELETE CASCADE,
  preferences_json jsonb NOT NULL DEFAULT '{}',
  results_json     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE auktivo_test.ai_recommendation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_recommendation_sessions"
  ON auktivo_test.ai_recommendation_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
