-- =============================================================
-- Migration: ZVG-Detail-Felder zu properties hinzufuegen
-- Erfasst alle Informationen der ZVG-Portal-Detailseite
-- =============================================================

DO $setup$
DECLARE
  schemas TEXT[] := ARRAY['auktivo_dev', 'auktivo_test', 'auktivo_prod'];
  s      TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    -- Art der Versteigerung (z. B. "Zwangsvollstreckung" vs "Insolvenz")
    EXECUTE format(
      'ALTER TABLE %I.properties ADD COLUMN IF NOT EXISTS art_versteigerung text',
      s
    );
    -- Grundbuch-Eintrag (z. B. "Grebenstein Blatt 4730")
    EXECUTE format(
      'ALTER TABLE %I.properties ADD COLUMN IF NOT EXISTS grundbuch text',
      s
    );
    -- Ausfuehrliche Beschreibung des Objekts (separates Feld auf Detailseite)
    EXECUTE format(
      'ALTER TABLE %I.properties ADD COLUMN IF NOT EXISTS beschreibung text',
      s
    );
    -- Ort der Versteigerung (Gerichtssaal, Adresse)
    EXECUTE format(
      'ALTER TABLE %I.properties ADD COLUMN IF NOT EXISTS versteigerungsort text',
      s
    );
    -- Informationen zum Glaeubiger
    EXECUTE format(
      'ALTER TABLE %I.properties ADD COLUMN IF NOT EXISTS glaeubigerinfo text',
      s
    );
    -- GeoServer-Link (Karten/Luftbilder)
    EXECUTE format(
      'ALTER TABLE %I.properties ADD COLUMN IF NOT EXISTS geoserver_url text',
      s
    );
  END LOOP;
END $setup$;
