#Requires -Version 5.1
<#
.SYNOPSIS
  Validates the e-cert frontend-only spec tree (views/features/ui/services).
.DESCRIPTION
  Checks required files exist, legacy scattered locations are gone,
  and every spec carries a Version/Status/Layer header.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/check-specs.ps1
#>
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$specs = Join-Path $root 'specs'
$fail = 0

function Fail([string]$msg) {
  Write-Host "FAIL: $msg" -ForegroundColor Red
  $script:fail++
}

function Ok([string]$msg) {
  Write-Host "ok: $msg" -ForegroundColor Green
}

# 1. Required files
$required = @(
  'README.md',
  '_template.md',
  'views\README.md',
  'features\README.md',
  'features\events.md',
  'features\certificates.md',
  'features\templates.md',
  'features\dashboard-audit.md',
  'features\attendee-deletion.md',
  'features\event-visibility.md',
  'features\template-visibility.md',
  'ui\README.md',
  'ui\not-found-state.md',
  'services\README.md',
  'services\api-client.md',
  'services\api-bff-layer.md',
  'services\auth.md',
  'services\platform.md',
  'services\vercel-deploy.md',
  'services\testing.md',
  'decisions\README.md'
)
foreach ($rel in $required) {
  $p = Join-Path $specs $rel
  if (Test-Path -LiteralPath $p) { Ok $rel } else { Fail "missing $rel" }
}

# 2. Legacy scattered locations must be gone
$banned = @(
  'auth',
  'pages',
  'components',
  'api-client',
  'environment',
  'deployment',
  'testing',
  'local-dev'
)
foreach ($dir in $banned) {
  $p = Join-Path $specs $dir
  if (Test-Path -LiteralPath $p) { Fail "legacy dir still exists: specs\$dir" }
  else { Ok "legacy dir gone: specs\$dir" }
}
if (Test-Path -LiteralPath (Join-Path $specs 'data-flow.md')) { Fail 'legacy file still exists: specs\data-flow.md' }
else { Ok 'legacy file gone: specs\data-flow.md' }

# 3. Headers: every spec .md (except openapi + decisions) must declare Version/Status/Layer
$skip = @('openapi', 'decisions')
$files = Get-ChildItem -LiteralPath $specs -Recurse -Filter '*.md' | Where-Object {
  $full = $_.FullName
  -not ($skip | Where-Object { $full -like "*\specs\$_\*" })
}
foreach ($f in $files) {
  $text = Get-Content -LiteralPath $f.FullName -Raw
  $rel = $f.FullName.Substring($specs.Length + 1)
  $missing = @()
  if ($text -notmatch '\*\*Version:\*\*') { $missing += 'Version' }
  if ($text -notmatch '\*\*Status:\*\*') { $missing += 'Status' }
  if ($text -notmatch '\*\*Layer:\*\*') { $missing += 'Layer' }
  if ($missing.Count -eq 0) { Ok "headers: $rel" }
  else { Fail "headers missing ($($missing -join ', ')): $rel" }
}

# 4. Root guide files
foreach ($rel in @('AI-GUIDE.md', 'AI-RULES.md', 'dependency-rules.md', 'glossary.md')) {
  $p = Join-Path $root $rel
  if (Test-Path -LiteralPath $p) { Ok $rel } else { Fail "missing $rel" }
}

if ($fail -gt 0) {
  Write-Host "$fail check(s) failed." -ForegroundColor Red
  exit 1
}
Write-Host 'All spec checks passed.' -ForegroundColor Green
