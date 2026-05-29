param(
    [string]$Url = "http://127.0.0.1:8000/?dev=1",
    [string]$Out = "screenshots/latest.png",
    [int]$Width = 728,
    [int]$Height = 909,
    [int]$WaitMs = 5000
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$outPath = if ([System.IO.Path]::IsPathRooted($Out)) {
    $Out
} else {
    Join-Path $root $Out
}
$outDir = Split-Path -Parent $outPath
$profileDir = Join-Path $root ".edge-screenshot-profile"
$logPath = "$outPath.log"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
Remove-Item -LiteralPath $outPath -ErrorAction SilentlyContinue

$browserCandidates = @(
    "C:\Program Files (x86)\Microsoft\EdgeCore\148.0.3967.83\msedge.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe"
)

$browser = $browserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) {
    throw "No Chromium browser found."
}

$args = @(
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-extensions",
    "--hide-scrollbars",
    "--window-size=$Width,$Height",
    "--virtual-time-budget=$WaitMs",
    "--user-data-dir=$profileDir",
    "--screenshot=$outPath",
    $Url
)

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $browser @args 2> $logPath | Out-Null
$ErrorActionPreference = $previousErrorActionPreference

if (-not (Test-Path $outPath)) {
    if (Test-Path $logPath) {
        Get-Content $logPath -Tail 80 | Write-Error
    }
    throw "Screenshot was not created."
}

Get-Item $outPath | Select-Object FullName, Length, LastWriteTime
