param(
    [int]$Port = 8000,
    [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$serverPath = Join-Path $root "dev-server.js"
$url = "http://$HostName`:$Port/?dev=1"

function Test-Server {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $url -Method Head -TimeoutSec 2
        return [int]$response.StatusCode -lt 500
    } catch {
        return $false
    }
}

if (Test-Server) {
    Write-Output "SemanticMap server already running: $url"
    exit 0
}

if (!(Test-Path $serverPath)) {
    throw "Cannot find dev-server.js at $serverPath"
}

Start-Process -FilePath "node.exe" `
    -ArgumentList "dev-server.js" `
    -WorkingDirectory $root `
    -WindowStyle Hidden

Start-Sleep -Milliseconds 700

if (!(Test-Server)) {
    throw "SemanticMap server did not start."
}

Write-Output "SemanticMap server started: $url"
