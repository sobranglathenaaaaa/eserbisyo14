$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\QA\_shared\automated\.env.qa'
$envFile = [System.IO.Path]::GetFullPath($envFile)

if (-not (Test-Path -Path $envFile)) {
  Write-Error "Missing env file: $envFile. Copy QA/_shared/automated/.env.qa.example to .env.qa and fill credentials."
}

Get-Content -Path $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line) { return }
  if ($line.StartsWith('#')) { return }

  $parts = $line -split '=', 2
  if ($parts.Count -ne 2) { return }

  $name = $parts[0].Trim()
  $value = $parts[1].Trim()
  if ($name) {
    [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

$required = @(
  'QA_BASE_URL',
  'QA_RESIDENT_EMAIL',
  'QA_RESIDENT_PASSWORD',
  'QA_ADMIN_EMAIL',
  'QA_ADMIN_PASSWORD',
  'QA_STAFF_EMAIL',
  'QA_STAFF_PASSWORD'
)

$missing = @()
foreach ($name in $required) {
  $value = [System.Environment]::GetEnvironmentVariable($name, 'Process')
  if ([string]::IsNullOrWhiteSpace($value)) {
    $missing += $name
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing required QA env vars: " + ($missing -join ', '))
}

npm run qa:e2e
