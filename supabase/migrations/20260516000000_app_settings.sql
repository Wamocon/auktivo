-- App Settings Key-Value Store
-- Speichert konfigurierbare App-Einstellungen mit Standardwerten

CREATE TABLE IF NOT EXISTS app_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL DEFAULT '',
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS: Nur Admins duerfen lesen und schreiben
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read settings"
  ON app_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auktivo_dev.profiles
      WHERE auktivo_dev.profiles.id = auth.uid()
      AND auktivo_dev.profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can write settings"
  ON app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auktivo_dev.profiles
      WHERE auktivo_dev.profiles.id = auth.uid()
      AND auktivo_dev.profiles.is_admin = true
    )
  );

-- Standard-Einstellungen eintragen (ON CONFLICT = update only if not already set)
INSERT INTO app_settings (key, value, description) VALUES
  ('maintenance_mode',       'false',        'Wartungsmodus aktiv - sperrt alle Nicht-Admins aus'),
  ('maintenance_message',    'Wir führen gerade Wartungsarbeiten durch. Bitte versuchen Sie es später erneut.', 'Nachricht die während des Wartungsmodus angezeigt wird'),
  ('free_search_limit',      '5',            'Maximale Suchanfragen pro Monat für Free-Nutzer'),
  ('crawler_schedule',       '0 6 * * *',    'Cron-Ausdruck für den täglichen Crawler-Lauf (UTC)'),
  ('crawler_rate_limit_ms',  '2000',         'Wartezeit in ms zwischen Bundesländer-Requests'),
  ('crawler_auto_start',     'false',        'Crawler automatisch bei Server-Start starten'),
  ('crawler_max_properties', '10000',        'Maximale Objekte die pro Lauf gespeichert werden'),
  ('crawler_active_states',  'all',          'Kommagetrennte Liste aktiver Bundesländer oder "all"'),
  ('admin_notification_email', '',           'E-Mail-Adresse für Admin-Fehlerbenachrichtigungen'),
  ('error_webhook_url',      '',             'Slack/Discord Webhook URL für Fehlerbenachrichtigungen'),
  ('app_name',               'Auktivo',      'Anwendungsname (für E-Mails und Anzeige)'),
  ('support_email',          '',             'Support-E-Mail-Adresse die Nutzern angezeigt wird'),
  ('max_users',              '0',            'Maximale Nutzeranzahl (0 = unbegrenzt)'),
  ('registration_enabled',   'true',         'Neue Nutzerregistrierungen erlauben'),
  ('pro_price_monthly',      '9.99',         'Monatlicher Pro-Plan Preis in EUR (nur Anzeige)')
ON CONFLICT (key) DO NOTHING;
