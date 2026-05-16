# Fuehrt die von setup.ps1 generierten 3 Basis-Variablen (URL, ANON_KEY, SERVICE_ROLE_KEY)
# mit den App-spezifischen Variablen zusammen.
# Aufruf: .\scripts\merge-env.ps1
# Wann: Direkt nach .\scripts\setup.ps1 -App auktivo ausfuehren.

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$EnvFile  = Join-Path $RepoRoot ".env.local"

if (-not (Test-Path $EnvFile)) {
    Write-Host "FEHLER: .env.local nicht gefunden. Zuerst setup.ps1 ausfuehren." -ForegroundColor Red
    exit 1
}

# Lese die von setup.ps1 generierten Basis-Variablen
$existing = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $existing[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}

# App-spezifische Variablen die setup.ps1 NICHT generiert
# Leer-Werte sind Platzhalter - fuelle sie mit echten Werten wenn vorhanden
$appVars = [ordered]@{
    # Schema
    "SUPABASE_DB_SCHEMA"                  = "auktivo_dev"
    "NEXT_PUBLIC_SUPABASE_DB_SCHEMA"      = "auktivo_dev"

    # DB direkter Zugriff (Port aus setup.ps1 ableiten)
    "SUPABASE_DB_URL"                     = "postgresql://postgres:postgres@127.0.0.1:$($existing['NEXT_PUBLIC_SUPABASE_URL'] -replace 'http://127.0.0.1:(\d+)', '$1' -replace '.*:(\d+)$', ([int]($_ = $existing['NEXT_PUBLIC_SUPABASE_URL'] -replace '.*:(\d+)$','$1'; [int]$_ + 1)))/postgres"

    # KI: MAX
    "MAX_API_BASE_URL"                    = ""
    "MAX_API_KEY"                         = ""
    "MAX_MODEL"                           = "max-default"

    # Stripe
    "STRIPE_SECRET_KEY"                   = ""
    "STRIPE_WEBHOOK_SECRET"               = ""
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"  = ""
    "STRIPE_PRO_PRICE_ID"                 = ""

    # Resend
    "RESEND_API_KEY"                      = ""
    "RESEND_FROM_EMAIL"                   = "noreply@auktivo.de"

    # Web Push
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY"        = ""
    "VAPID_PRIVATE_KEY"                   = ""
    "VAPID_SUBJECT"                       = "mailto:admin@auktivo.de"

    # App
    "NEXT_PUBLIC_APP_URL"                 = "http://localhost:3000"
    "NEXT_PUBLIC_APP_NAME"                = "Auktivo"

    # Cron
    "CRON_SECRET"                         = ""
}

# DB-URL aus dem API-Port ableiten (API = portApi, DB = portApi + 1)
$apiUrl = $existing['NEXT_PUBLIC_SUPABASE_URL']
if ($apiUrl -match ':(\d+)$') {
    $apiPort = [int]$Matches[1]
    $dbPort  = $apiPort + 1
    $appVars["SUPABASE_DB_URL"] = "postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres"
} else {
    $appVars["SUPABASE_DB_URL"] = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
}

# Merge: vorhandene Werte aus Backup wiederherstellen
$backupFile = Join-Path $RepoRoot ".env.local.backup"
$backupVars = @{}
if (Test-Path $backupFile) {
    Get-Content $backupFile | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.*)$') {
            $backupVars[$Matches[1].Trim()] = $Matches[2].Trim()
        }
    }
    Write-Host "Backup gefunden - stelle vorhandene Werte wieder her." -ForegroundColor Cyan
}

# Aufbau der finalen .env.local
$output  = "# Basis-Variablen (generiert von scripts/setup.ps1)`r`n"
foreach ($key in @('NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY')) {
    $val = if ($existing.ContainsKey($key)) { $existing[$key] } else { "" }
    $output += "${key}=${val}`r`n"
}

$output += "`r`n# App-Konfiguration (verwaltet von scripts/merge-env.ps1)`r`n"
foreach ($key in $appVars.Keys) {
    # Backup-Wert hat Vorrang vor Default, aber nur wenn nicht leer
    $val = if ($backupVars.ContainsKey($key) -and $backupVars[$key] -ne "") {
        $backupVars[$key]
    } else {
        $appVars[$key]
    }
    $output += "${key}=${val}`r`n"
}

[System.IO.File]::WriteAllText($EnvFile, $output, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  .env.local erfolgreich zusammengefuehrt!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Schema: auktivo_dev" -ForegroundColor Yellow
Write-Host "  DB URL: $($appVars['SUPABASE_DB_URL'])" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Jetzt: npm run dev" -ForegroundColor Cyan
