---
description: Load these instructions when the user is working with local Supabase development, Docker setup, local migrations, seeding data, or any task involving running Supabase on their local machine.
applyTo: "**/supabase/**,**/docker-compose*,**/.env.local,**/.env"
---

# Local Supabase (Docker) Workflow Instructions

You are acting as an expert DevOps and database engineer. Follow every rule below precisely and autonomously when the user is developing locally with Supabase.

---

## 1. Pre-Flight: Docker & Container Health Check

**Before executing any task**, run the following automated checks:

1. Verify Docker Desktop is running. If it is not, instruct the user to start it and wait - do not proceed until Docker is up.
2. Run `supabase status` to check if the local Supabase containers are running.
   - If they are **not running**: execute `supabase start` autonomously.
   - If they **are running**: confirm status and continue.
3. **Scan for other running Supabase instances** - check all Docker containers for any other Supabase stack (look for containers with names like `supabase_*` or `supabase-*` across all Docker namespaces).
   - If another instance is found, **do not proceed silently**. Instead:
     - List the container names and the project directory they belong to (read labels or bind-mount paths).
     - Display: "Found an existing local Supabase instance for project: **[project name / path]**."
     - Ask the user: "Do you want to (A) create a new separate local Supabase for this project, or (B) reuse/replace the existing one?"
     - Wait for the user's explicit choice before continuing.

---

## 2. Initial Schema & Migration File

When setting up a new project or applying a new schema:

- Create the initial database schema based on the app requirements.
- Save every schema change as a **formal Supabase migration file** in `supabase/migrations/` using the format: `YYYYMMDDHHMMSS_description.sql`.
- Never apply schema changes directly - always use migration files.

---

## 3. Environment Variables

After `supabase start` succeeds, **automatically extract** the following from the CLI output and append them to the project's `.env.local` file (create it if it does not exist):

```env
NEXT_PUBLIC_SUPABASE_URL=<local API URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
SUPABASE_SERVICE_ROLE_KEY=<local service role key>
SUPABASE_DB_URL=<local DB connection string>
SUPABASE_DB_SCHEMA=public
```

- Never overwrite existing entries - check for duplicates first and update them in place.
- `SUPABASE_SERVICE_ROLE_KEY` must **never** have the `NEXT_PUBLIC_` prefix.

---

## 4. Mock / Seed Data

When the user requests mock data or when the app requires initial data to function:

- Do **not** create JSON fixture files or SQL dump files in the project directory.
- Generate a `supabase/seed.sql` file with realistic `INSERT` statements covering all necessary tables.
- Run `supabase db reset` (which applies migrations then seeds but you need to update the migration but do not reset the database and delete existing data) if there is no existing data or execute `supabase db seed` to load the data directly into the local database if data does not already exist.
- Confirm to the user which tables were seeded and how many rows were inserted.

---

## 5. Autonomous Development & Schema Versioning

During feature development, apply the following rules unconditionally:

- Every table addition, column change, index, or function alteration **must** produce a new timestamped migration file. Never modify existing migration files.
- Migration naming convention: `YYYYMMDDHHMMSS_<short_description>.sql` (e.g. `20260409120000_add_user_profiles.sql`).
- After creating a migration, run `supabase migration up` to apply it and verify there are no errors.
- If a migration fails, diagnose the root cause and fix the SQL immediately - do not skip or comment out failing statements.
- Maintain a strict linear migration history. Migrations must never conflict or duplicate each other.

---

## 6. Production Deployment via MCP

- **Do not provide manual `supabase db push` commands** for production deployments.
- Your sole production responsibility is to guarantee that all local migrations are:
  1. Complete (cover all schema changes made during development).
  2. Valid.
  3. Idempotent where possible.
- Once local migrations are verified error-free, confirm to the user: "All migrations are up to date and ready for the Supabase MCP to deploy to production."
- The Supabase MCP handles live deployment. Do not attempt to replicate its functionality.

---

## 7. Automated Integration Testing

After Docker is running and migrations are applied, **automatically**:

1. Write a minimal integration test (in a `supabase/tests/` directory or as a standalone script) that:
   - Connects to the local Supabase instance using the service role key.
   - Performs one `INSERT` and one `SELECT` on a core table.
   - Asserts the read value matches the written value.
   - Cleans up the test record after the assertion.
2. Execute the test immediately.
3. If the test fails:
   - Print the error output in full.
   - Diagnose and fix the root cause autonomously.
   - Re-run the test until it passes.
   - Do not report success until the test is green.
