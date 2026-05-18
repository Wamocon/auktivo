-- Migration: storage_path fuer heruntergeladene ZVG-Dokumente
-- Ermoeglicht permanenten Zugriff auf Dokumente ohne ZVG-Session
-- Fuegt auch den UNIQUE-Constraint fuer Upsert-Logik hinzu
DO $$
DECLARE
  s text;
  s_safe text;
BEGIN
  FOREACH s IN ARRAY ARRAY['auktivo_dev', 'auktivo_test', 'auktivo_prod'] LOOP
    s_safe := replace(s, '-', '_');

    -- storage_path Spalte hinzufuegen
    EXECUTE format(
      'ALTER TABLE %I.property_documents ADD COLUMN IF NOT EXISTS storage_path text',
      s
    );

    -- UNIQUE-Constraint fuer (property_id, original_url) - benoetigt fuer Upsert
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_%s_docs_url ON %I.property_documents(property_id, original_url)',
      s_safe, s
    );
  END LOOP;
END $$;
