-- Seed-Daten fuer lokale Entwicklung
-- Wird durch supabase db seed ausgefuehrt

SET search_path TO auktivo_dev, public;

-- Beispiel-Properties fuer Entwicklung und Tests
INSERT INTO auktivo_dev.properties (
  zvg_id, court, court_file_number, auction_date, property_type,
  address, city, zip_code, state, lat, lng,
  market_value, minimum_bid, document_urls, status
) VALUES
(
  'DEV-2026-001',
  'Amtsgericht Muenchen',
  'XIV 12/2026',
  now() + interval '14 days',
  'apartment',
  'Maximilianstrasse 42',
  'Muenchen',
  '80539',
  'Bayern',
  48.1399, 11.5784,
  385000, 192500,
  ARRAY['https://example.com/gutachten-001.pdf'],
  'active'
),
(
  'DEV-2026-002',
  'Amtsgericht Berlin-Mitte',
  'XIV 8/2026',
  now() + interval '21 days',
  'house',
  'Prenzlauer Allee 112',
  'Berlin',
  '10409',
  'Berlin',
  52.5387, 13.4244,
  520000, 260000,
  ARRAY['https://example.com/gutachten-002.pdf'],
  'active'
),
(
  'DEV-2026-003',
  'Amtsgericht Hamburg',
  'XIV 15/2026',
  now() + interval '7 days',
  'commercial',
  'Hafenstrasse 22',
  'Hamburg',
  '20459',
  'Hamburg',
  53.5436, 9.9742,
  950000, 475000,
  ARRAY['https://example.com/gutachten-003.pdf'],
  'active'
),
(
  'DEV-2026-004',
  'Amtsgericht Koeln',
  'XIV 3/2026',
  now() + interval '30 days',
  'apartment',
  'Schildergasse 5',
  'Koeln',
  '50667',
  'Nordrhein-Westfalen',
  50.9373, 6.9569,
  165000, 82500,
  ARRAY['https://example.com/gutachten-004.pdf'],
  'active'
),
(
  'DEV-2026-005',
  'Amtsgericht Frankfurt',
  'XIV 7/2026',
  now() + interval '10 days',
  'house',
  'Sachsenhaeuser Ufer 18',
  'Frankfurt am Main',
  '60594',
  'Hessen',
  50.1001, 8.6870,
  720000, 360000,
  ARRAY['https://example.com/gutachten-005.pdf'],
  'active'
)
ON CONFLICT (zvg_id) DO NOTHING;

-- Beispiel-Analysen (damit Pro-Features testbar sind)
INSERT INTO auktivo_dev.property_analyses (
  property_id, risk_level, risk_signals, summary, analysis_model, prompt_version, analysis_status, analyzed_at
)
SELECT
  p.id,
  'medium',
  '{
    "baulasten": [{"description": "Leitungsrecht fuer Gasversorgung eingetragen", "severity": "low", "text_excerpt": "...eingetragenes Leitungsrecht..."}],
    "sanierungsbedarf": [{"description": "Dach erneuerungsbeduerftig, Schaetzung 25.000-35.000 EUR", "cost_estimate_eur": "25000-35000", "severity": "medium", "text_excerpt": "...Dach weist Mangel auf..."}],
    "mietverhaeltnisse": [],
    "grundbuchbelastungen": [{"description": "Grundschuld zugunsten Stadtsparkasse Muenchen", "type": "Grundschuld", "amount_eur": 250000, "severity": "low"}],
    "positive_signals": [{"description": "Gute Lage, Innenstadt nahe"}, {"description": "Keine Problemieter"}],
    "disclaimer": "Diese KI-Analyse dient nur zur Orientierung und ersetzt keine rechtliche oder bautechnische Fachberatung."
  }'::jsonb,
  'Das Objekt zeigt mittleres Risikopotenzial. Ein Leitungsrecht und eine Grundschuld sind im Grundbuch eingetragen, stellen aber keine kritischen Hindernisse dar. Das Dach benoetigt Sanierung (ca. 25.000-35.000 EUR). Keine problematischen Mietverhaeltnisse vorhanden. Insgesamt ein solides Objekt mit kalkulierbaren Risiken.',
  'max-default',
  'v1.0',
  'done',
  now()
FROM auktivo_dev.properties p
WHERE p.zvg_id = 'DEV-2026-001'
ON CONFLICT (property_id) DO NOTHING;
