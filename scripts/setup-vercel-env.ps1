# =============================================================
# Vercel Env-Vars Setup Script
# Liest .env.local und pusht alle Variablen nach Vercel
# (preview + production)
#
# Ausfuehren:
#   1. vercel login      (einmalig im Terminal)
#   2. .\scripts\setup-vercel-env.ps1
# =============================================================

$envFile = Join-Path $PSScriptRoot ".." ".env.local"
$envFile = Resolve-Path $envFile

if (-not (Test-Path $envFile)) {
  Write-Error ".env.local nicht gefunden: $envFile"
  exit 1
}

# Variablen die NICHT nach Vercel gehoeren
$skip = @("NODE_ENV", "SUPABASE_DB_URL")

# Variablen deren NEXT_PUBLIC_APP_URL fuer Vercel angepasst werden soll
# (localhost funktioniert auf Vercel nicht)
$overrides = @{
  "NEXT_PUBLIC_APP_URL" = "https://auktivo.vercel.app"
}

Write-Host ""
Write-Host "Vercel Env-Vars Setup" -ForegroundColor Cyan
Write-Host "Quelle: $envFile" -ForegroundColor Gray
Write-Host ""

# .env.local parsen
$vars = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  # Leerzeilen und Kommentare ueberspringen
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $idx = $line.IndexOf("=")
  if ($idx -lt 1) { return }
  $key   = $line.Substring(0, $idx).Trim()
  $value = $line.Substring($idx + 1).Trim()
  if ($skip -contains $key) { return }
  if ($overrides.ContainsKey($key)) { $value = $overrides[$key] }
  $vars[$key] = $value
}

Write-Host "Gefundene Variablen: $($vars.Count)" -ForegroundColor Yellow
Write-Host ""

$ok   = 0
$fail = 0

foreach ($key in $vars.Keys | Sort-Object) {
  $value = $vars[$key]
  $envs  = "production", "preview"

  Write-Host -NoNewline "  $key ... "

  try {
    foreach ($env in $envs) {
      # Bestehende Variable loeschen (falls vorhanden) - Fehler ignorieren
      $null = echo $value | vercel env rm $key $env --yes 2>$null

      # Neue Variable setzen
      $result = echo $value | vercel env add $key $env 2>&1
      if ($LASTEXITCODE -ne 0) {
        throw $result
      }
    }
    Write-Host "OK" -ForegroundColor Green
    $ok++
  } catch {
    Write-Host "FEHLER: $_" -ForegroundColor Red
    $fail++
  }
}

Write-Host ""
Write-Host "Fertig: $ok gesetzt, $fail Fehler" -ForegroundColor Cyan
Write-Host ""
Write-Host "Naechster Schritt: Vercel neu deployen" -ForegroundColor Yellow
Write-Host "  vercel redeploy --prebuilt" -ForegroundColor Gray
Write-Host ""
