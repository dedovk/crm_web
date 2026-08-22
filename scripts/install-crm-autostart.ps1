$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $PSScriptRoot 'start-crm.ps1'
$taskName = 'CRM Web Server'
$powerShell = (Get-Command powershell.exe -ErrorAction Stop).Source

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is not installed or is not available in PATH.'
}

if (-not (Test-Path (Join-Path $projectRoot 'dist'))) {
    throw 'The dist folder is missing. Run npm run build first.'
}

$action = New-ScheduledTaskAction `
    -Execute $powerShell `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Force | Out-Null

Write-Host "Installed '$taskName'."
Write-Host 'The server will start automatically after your next Windows logon.'
Write-Host 'Open http://localhost:3002/ in your browser.'
