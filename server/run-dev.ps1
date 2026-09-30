<#
  Starts the Lucid API for local development.

  Two things this handles that are easy to get wrong by hand:
    1. Jwt__Key must be set - the key is blank in appsettings.json on purpose so
       no real secret is committed. Without it the app refuses to start.
    2. The working directory must be the project folder, otherwise the content
       root resolves to the repo root and appsettings.json is never found.

  Usage:
    .\server\run-dev.ps1              # normal start
    .\server\run-dev.ps1 -Rebuild     # build first
    .\server\run-dev.ps1 -Swagger     # also print the Swagger URL
#>
[CmdletBinding()]
param(
    [switch]$Rebuild,
    [switch]$Swagger,
    [int]$Port = 5000
)

$ErrorActionPreference = 'Stop'

# Ensure dotnet is on PATH even in a shell that started before it was installed.
$machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
$userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$env:Path = "$machinePath;$userPath"

if (-not $env:Jwt__Key) {
    # Development-only key. Never reuse this outside local development.
    $env:Jwt__Key = 'dev-only-lucid-jwt-signing-key-change-me-32b+'
    Write-Host "Jwt__Key not set - using the local development key." -ForegroundColor Yellow
}

$projectDir = Join-Path $PSScriptRoot 'src\Lucid.Api'

# Refuse to start if something already owns the port. Without this, Kestrel
# throws a SocketException (10048) that looks like a server bug but just means
# a previous instance is still running.
$existing = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -First 1

if ($existing) {
    $owner = Get-Process -Id $existing.OwningProcess -ErrorAction SilentlyContinue
    Write-Host ''
    Write-Host "  Port $Port is already in use by $($owner.ProcessName) (pid $($existing.OwningProcess))." -ForegroundColor Red
    Write-Host ''
    Write-Host '  The API is most likely already running. Open:' -ForegroundColor Yellow
    Write-Host "    http://localhost:$Port/swagger" -ForegroundColor Yellow
    Write-Host ''
    Write-Host '  To stop it and start a fresh instance:' -ForegroundColor Yellow
    Write-Host "    Stop-Process -Id $($existing.OwningProcess)" -ForegroundColor DarkGray
    Write-Host '    .\server\run-dev.ps1' -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '  Or start on a different port:' -ForegroundColor Yellow
    Write-Host "    .\server\run-dev.ps1 -Port 5001" -ForegroundColor DarkGray
    Write-Host ''
    exit 1
}

if ($Rebuild) {
    Write-Host 'Building solution...' -ForegroundColor Cyan
    dotnet build (Join-Path $PSScriptRoot 'Lucid.sln')
    if ($LASTEXITCODE -ne 0) {
        throw 'Build failed.'
    }
}

$env:ASPNETCORE_URLS = "http://localhost:$Port"

Push-Location $projectDir
try {
    Write-Host ''
    Write-Host "  API      http://localhost:$Port" -ForegroundColor Green
    if ($Swagger) {
        Write-Host "  Swagger  http://localhost:$Port/swagger" -ForegroundColor Green
    }
    Write-Host "  Health   http://localhost:$Port/health/ready" -ForegroundColor Green
    Write-Host ''
    Write-Host '  Frontend (separate terminal): cd web; npm run dev  ->  http://localhost:5173' -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '  Press Ctrl+C to stop.' -ForegroundColor DarkGray
    Write-Host ''

    dotnet exec 'bin\Debug\net8.0\Lucid.Api.dll'
}
finally {
    Pop-Location
}
