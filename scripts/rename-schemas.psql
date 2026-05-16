-- Rename schemas from hyphen to underscore (run once per environment)
-- Uses DO block for PostgreSQL linter compatibility
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_namespace WHERE nspname = 'auktivo-dev') THEN
    ALTER SCHEMA "auktivo-dev" RENAME TO auktivo_dev;
  END IF;
  IF EXISTS (SELECT FROM pg_namespace WHERE nspname = 'auktivo-test') THEN
    ALTER SCHEMA "auktivo-test" RENAME TO auktivo_test;
  END IF;
  IF EXISTS (SELECT FROM pg_namespace WHERE nspname = 'auktivo-prod') THEN
    ALTER SCHEMA "auktivo-prod" RENAME TO auktivo_prod;
  END IF;
END $$;

SELECT nspname FROM pg_namespace WHERE nspname LIKE 'auktivo%' ORDER BY nspname;
