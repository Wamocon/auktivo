-- =============================================================
-- Migration: objekt_lage und land_abk zu properties hinzufuegen
-- Speichert den rohen ZVG-Beschreibungstext fuer bessere Detailansicht
-- =============================================================

DO $setup$
DECLARE
  schemas TEXT[] := ARRAY['auktivo_dev', 'auktivo_test', 'auktivo_prod'];
  s      TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    -- objekt_lage: Roher Beschreibungstext vom ZVG-Portal
    EXECUTE format(
      'ALTER TABLE %I.properties ADD COLUMN IF NOT EXISTS objekt_lage text',
      s
    );
    -- land_abk: Bundesland-Abkuerzung (bw, by, be, ...)
    EXECUTE format(
      'ALTER TABLE %I.properties ADD COLUMN IF NOT EXISTS land_abk text',
      s
    );
  END LOOP;
END $setup$;
