/**
 * Kopiert User-Profile aus auktivo_dev in auktivo_test und auktivo_prod.
 *
 * Ausfuehren:
 *   node scripts/sync-user-profiles.mjs
 *
 * Voraussetzung: .env.local muss NEXT_PUBLIC_SUPABASE_URL und
 *               SUPABASE_SERVICE_ROLE_KEY enthalten.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// --- .env.local einlesen ---
const envPath = resolve(process.cwd(), ".env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
const env = {};
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const KEY = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!URL || !KEY) {
  console.error("Fehler: NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht gefunden.");
  process.exit(1);
}

const EMAILS = [
  "erwin.moretz@wamocon.com",
  "daniel.moretz@wamocon.com",
  "waleri.moretz@wamocon.com",
  "leon.moretz@wamocon.com",
  "olga.moretz@wamocon.com",
  "elias.felsing@wamocon.com",
  "yash.bhesaniya@wamocon.com",
  "maanik.garg@wamocon.com",
  "nurzhan.kukeyev@wamocon.com",
];

const makeClient = (schema) =>
  createClient(URL, KEY, {
    db: { schema },
    auth: { autoRefreshToken: false, persistSession: false },
  });

const dev  = makeClient("auktivo_dev");
const test = makeClient("auktivo_test");
const prod = makeClient("auktivo_prod");

// 1. Profile aus auktivo_dev lesen
console.log("Lese Profile aus auktivo_dev ...");
const { data: profiles, error: fetchErr } = await dev
  .from("profiles")
  .select("*")
  .in("email", EMAILS);

if (fetchErr) {
  console.error("Fehler beim Lesen:", fetchErr.message);
  process.exit(1);
}

if (!profiles || profiles.length === 0) {
  console.error("Keine User-Profile in auktivo_dev gefunden. Bitte zuerst dort anlegen.");
  process.exit(1);
}

console.log(`Gefunden: ${profiles.length} Profile in auktivo_dev`);
for (const p of profiles) {
  console.log(`  - ${p.email}  (id: ${p.id}, plan: ${p.plan})`);
}

// 2. In auktivo_test und auktivo_prod upserten
for (const [name, client] of [["auktivo_test", test], ["auktivo_prod", prod]]) {
  console.log(`\nKopiere nach ${name} ...`);
  const { error: upsertErr } = await client
    .from("profiles")
    .upsert(profiles, { onConflict: "id" });

  if (upsertErr) {
    console.error(`  Fehler bei ${name}:`, upsertErr.message);
  } else {
    console.log(`  OK - ${profiles.length} Profile in ${name} angelegt/aktualisiert.`);
  }
}

console.log("\nFertig.");
