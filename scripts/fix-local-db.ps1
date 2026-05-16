# =============================================================
# fix-local-db.ps1 - Repariert lokale Supabase nach Schema-Rename
#
# Aufgaben:
#   1. Benennt Schemas in der laufenden lokalen DB um
#      (auktivo-dev → auktivo_dev etc.)
#   2. Stellt Admin-Profil sicher (plan=pro, is_admin=true)
#   3. Erstellt den PostgREST-Container mit den neuen Schema-Namen
#      neu (supabase_rest_auktivo)
#
# Voraussetzungen:
#   - Docker muss laufen
#   - Lokale Supabase muss laufen (kong auf Port 54331, DB auf 54332)
#   - supabase_rest_auktivo-Container muss vorher existiert haben
#     (um JWKS, JwtSecret etc. auszulesen)
# =============================================================
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "=== Auktivo Local DB Fix ===" -ForegroundColor Cyan

# ------------------------------------------------------------
# 1. Schemas in der DB umbenennen
# ------------------------------------------------------------
Write-Host "`n[1/3] Schemas in DB umbenennen..." -ForegroundColor Yellow

$psql = "psql"
$dbUrl = "postgresql://postgres:postgres@127.0.0.1:54332/postgres"
$sqlFile = Join-Path $PSScriptRoot "rename-schemas.sql"

if (-not (Test-Path $sqlFile)) {
  Write-Error "Datei nicht gefunden: $sqlFile"
  exit 1
}

try {
  & $psql $dbUrl -f $sqlFile
  Write-Host "  Schemas erfolgreich umbenannt." -ForegroundColor Green
} catch {
  Write-Warning "psql Fehler (evtl. Schemas bereits umbenannt): $_"
}

# Verify
$result = & $psql $dbUrl -t -c "SELECT nspname FROM pg_namespace WHERE nspname LIKE 'auktivo%' ORDER BY nspname;"
Write-Host "  Vorhandene Schemas:" -ForegroundColor Cyan
$result | ForEach-Object { Write-Host "    $_" }

# Admin-Profil korrigieren
Write-Host "`n[1b] Admin-Profil sicherstellen (plan=pro, is_admin=true)..." -ForegroundColor Yellow
$updateSql = "UPDATE auktivo_dev.profiles SET plan='pro', is_admin=true, updated_at=now() WHERE email='nikolaj.schefner@wamocon.com';"
& $psql $dbUrl -c $updateSql
Write-Host "  Admin-Profil aktualisiert." -ForegroundColor Green

# PostgREST GUC-Einstellung korrigieren (ueberschreibt die env var!)
Write-Host "`n[1c] PostgREST pgrst.db_schemas GUC fuer authenticator-Rolle korrigieren..." -ForegroundColor Yellow
$gusSql = "ALTER ROLE authenticator SET `"pgrst.db_schemas`" = 'public,graphql_public,auktivo_dev,auktivo_test,auktivo_prod';"
& $psql $dbUrl -c $gusSql
Write-Host "  GUC-Einstellung aktualisiert." -ForegroundColor Green

# Auth-Trigger aktualisieren
Write-Host "`n[1d] Auth-Trigger auf neues Schema aktualisieren..." -ForegroundColor Yellow
$triggerSql = @"
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auktivo_dev.handle_new_user();
"@
& $psql $dbUrl -c $triggerSql
Write-Host "  Trigger aktualisiert." -ForegroundColor Green

# ------------------------------------------------------------
# 2. PostgREST-Container konfigurieren
# ------------------------------------------------------------
Write-Host "`n[2/3] PostgREST-Container neu erstellen..." -ForegroundColor Yellow

$containerName = "supabase_rest_auktivo"
$networkName = "supabase_network_auktivo"

# JWKS aus dem laufenden Container auslesen (falls vorhanden)
$existingJwks = $null
$existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null
if ($existingContainer -eq $containerName) {
  Write-Host "  Bestehender Container gefunden - JWKS auslesen..." -ForegroundColor Cyan
  $existingJwks = docker inspect $containerName --format "{{range .Config.Env}}{{println .}}{{end}}" 2>$null |
    Where-Object { $_ -match "PGRST_JWT_SECRET" } |
    ForEach-Object { $_ -replace "PGRST_JWT_SECRET=", "" }

  Write-Host "  Container stoppen und entfernen..." -ForegroundColor Yellow
  docker stop $containerName 2>$null | Out-Null
  docker rm $containerName 2>$null | Out-Null
  Write-Host "  Alter Container entfernt." -ForegroundColor Green
} else {
  Write-Host "  Kein bestehender Container gefunden." -ForegroundColor Yellow
}

# JWKS - Standard-JWKS fuer lokale Supabase-Instanz (ES256 + oct)
$defaultJwks = '{"keys":[{"kty":"EC","kid":"b81269f1-21d8-4f2e-b719-c2240a840d90","use":"sig","alg":"ES256","crv":"P-256","x":"M5Sjqn5zwC9Kl1zVfUUGvv9boQjCGd45G8sdopBExB4","y":"P6IXMvA2WYXSHSOMTBH2jsw_9rrzGy89FjPf6oOsIxQ"},{"kty":"oct","k":"c3VwZXItc2VjcmV0LWp3dC10b2tlbi13aXRoLWF0LWxlYXN0LTMyLWNoYXJhY3RlcnMtbG9uZw"}]}'
$jwks = if ($existingJwks) { $existingJwks } else { $defaultJwks }

Write-Host "  Neuen PostgREST-Container erstellen..." -ForegroundColor Yellow
docker run -d `
  --name $containerName `
  --network $networkName `
  -e "PGRST_DB_URI=postgresql://authenticator:password@supabase_db_auktivo:5432/postgres" `
  -e "PGRST_DB_SCHEMAS=public,graphql_public,auktivo_dev,auktivo_test,auktivo_prod" `
  -e "PGRST_DB_ANON_ROLE=anon" `
  -e "PGRST_JWT_SECRET=$jwks" `
  -e "PGRST_DB_USE_LEGACY_GUCS=false" `
  -e "PGRST_APP_SETTINGS_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long" `
  -e "PGRST_APP_SETTINGS_JWT_EXP=3600" `
  postgrest/postgrest:v14.10

Write-Host "  PostgREST-Container gestartet." -ForegroundColor Green

# Kurz warten und Status prüfen
Start-Sleep -Seconds 3
$status = docker inspect $containerName --format "{{.State.Status}}" 2>$null
Write-Host "  Container-Status: $status" -ForegroundColor $(if ($status -eq "running") { "Green" } else { "Red" })

# ------------------------------------------------------------
# 3. Verbindung testen
# ------------------------------------------------------------
Write-Host "`n[3/3] Verbindung testen..." -ForegroundColor Yellow

Start-Sleep -Seconds 2

# Anon-Key dynamisch aus supabase status lesen
$anonKey = $null
try {
  $statusJson = supabase status --output json 2>$null | ConvertFrom-Json
  $anonKey = $statusJson.anon_key
} catch {}
if (-not $anonKey) {
  # Fallback: aus .env.local lesen
  $envFile = Join-Path $PSScriptRoot "..\\.env.local"
  if (Test-Path $envFile) {
    $anonKey = (Get-Content $envFile | Where-Object { $_ -match "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" }) -replace "^NEXT_PUBLIC_SUPABASE_ANON_KEY=", ""
  }
}
if (-not $anonKey) {
  Write-Warning "  Anon-Key nicht ermittelt - Verbindungstest wird uebersprungen."
} else {
  try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:54331/rest/v1/profiles" `
      -Headers @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
      } -ErrorAction Stop
    Write-Host "  API-Test erfolgreich - Verbindung OK." -ForegroundColor Green
  } catch {
    Write-Warning "  API-Test fehlgeschlagen: $($_.Exception.Message)"
    Write-Host "  PostgREST-Logs prüfen mit: docker logs $containerName" -ForegroundColor Yellow
  }
}

Write-Host "`n=== Fix abgeschlossen ===" -ForegroundColor Green
Write-Host @"

Nächste Schritte:
  1. Next.js Dev-Server neu starten: npm run dev
  2. Browser-Cache leeren (F5 / Ctrl+Shift+R)
  3. Einloggen und Dashboard prüfen (plan=pro + Admin-Link sichtbar)
  
PostgREST-Logs:      docker logs $containerName
PostgREST-Status:    docker inspect $containerName --format '{{.State.Status}}'
"@ -ForegroundColor Cyan
