-- Migration: 'enriching' Status fuer selbst-kettende Detail-Anreicherung hinzufuegen
--
-- Hintergrund: Der automatische Enrichment-Crawler (/api/crawler/enrich) setzt
-- Status = 'enriching' waehrend eines laufenden Anreicherungs-Batches. Dieser
-- Status war nicht in der CHECK-Constraint der crawler_runs-Tabelle definiert.
-- Ohne diesen Fix scheiterten alle INSERTs/UPDATEs mit 'enriching' lautlos,
-- womit die Duplikatschutzlogik komplett wirkungslos war.

-- Schritt 1: Bestehende CHECK-Constraint entfernen (Name per PostgreSQL-Konvention)
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT constraint_name
    INTO v_constraint
    FROM information_schema.table_constraints
   WHERE table_schema = current_schema()
     AND table_name   = 'crawler_runs'
     AND constraint_type = 'CHECK'
     AND constraint_name LIKE '%status%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE crawler_runs DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

-- Schritt 2: Neue CHECK-Constraint mit 'enriching' hinzufuegen
ALTER TABLE crawler_runs
  ADD CONSTRAINT crawler_runs_status_check
  CHECK (status IN ('running', 'completed', 'failed', 'enriching'));
