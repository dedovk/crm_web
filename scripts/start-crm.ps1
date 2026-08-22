$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $projectRoot 'logs'
$logFile = Join-Path $logDirectory 'crm-server.log'
$node = (Get-Command node -ErrorAction Stop).Source

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
Set-Location $projectRoot

"[$(Get-Date -Format s)] Starting CRM server" | Add-Content $logFile
& $node 'server.js' *>> $logFile
