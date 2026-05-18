/**
 * Einmalig-Script: Fuegt 'enriching' zur CHECK-Constraint der crawler_runs-Tabelle hinzu.
 * Ausfuehren: node scripts/apply-enriching-migration.mjs
 */
import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
});

async function run() {
  await client.connect();
  console.log("Verbunden. Pruefe bestehende Constraints...");

  const checkRes = await client.query(`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'auktivo_dev'
      AND table_name   = 'crawler_runs'
      AND constraint_type = 'CHECK'
  `);
  console.log("Bestehende CHECK-Constraints:", checkRes.rows);

  // Bestehende status-Constraint entfernen
  for (const row of checkRes.rows) {
    if (row.constraint_name.includes("status")) {
      console.log(`Entferne Constraint: ${row.constraint_name}`);
      await client.query(
        `ALTER TABLE auktivo_dev.crawler_runs DROP CONSTRAINT "${row.constraint_name}"`
      );
    }
  }

  // Neue Constraint mit 'enriching' hinzufuegen
  console.log("Fuege neue Constraint mit 'enriching' hinzu...");
  await client.query(`
    ALTER TABLE auktivo_dev.crawler_runs
      ADD CONSTRAINT crawler_runs_status_check
      CHECK (status IN ('running', 'completed', 'failed', 'enriching'))
  `);

  console.log("Migration erfolgreich abgeschlossen!");

  // Verifikation
  const verify = await client.query(`
    SELECT constraint_name, check_clause
    FROM information_schema.check_constraints
    WHERE constraint_schema = 'auktivo_dev'
      AND constraint_name = 'crawler_runs_status_check'
  `);
  console.log("Neue Constraint:", verify.rows);

  await client.end();
}

run().catch((err) => {
  console.error("Fehler:", err.message);
  process.exit(1);
});
