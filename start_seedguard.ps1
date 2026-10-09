$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$pythonPackages = Join-Path $projectRoot 'work/python-packages'
$bundledPython = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'

if (-not (Test-Path (Join-Path $pythonPackages 'uvicorn'))) {
    throw 'SeedGuard dependencies are missing. Install them with: python -m pip install --target work/python-packages -r requirements.txt'
}

foreach ($port in @(8000, 8001, 8002, 8003)) {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 2
        $standards = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/seed-standards?crop=wheat&seed_type=variety&seed_class=certified" -TimeoutSec 2
        $options = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/seed-standard-options" -TimeoutSec 2
        if ($health.status -eq 'ok' -and $standards.crop_label -eq 'Wheat' -and $options.crops.Count -ge 9) {
            Write-Host "SeedGuard is already running at http://127.0.0.1:$port/"
            exit 0
        }
    } catch {
        # Try the next local port when this one is not serving SeedGuard.
    }
}

$env:PYTHONPATH = $pythonPackages
if (Test-Path $bundledPython) {
    $python = $bundledPython
} else {
    $python = (Get-Command python -ErrorAction Stop).Source
}

$lastOutput = ''
foreach ($port in @(8000, 8001, 8002, 8003)) {
    $stdoutLog = Join-Path $projectRoot "work/seedguard-server-$port.out.log"
    $stderrLog = Join-Path $projectRoot "work/seedguard-server-$port.err.log"
    $server = Start-Process -FilePath $python `
        -ArgumentList "-m uvicorn backend.main:app --host 127.0.0.1 --port $port" `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -PassThru

    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 500
        if ($server.HasExited) { break }
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 1
            $standards = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/seed-standards?crop=wheat&seed_type=variety&seed_class=certified" -TimeoutSec 1
            $options = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/seed-standard-options" -TimeoutSec 1
            if ($health.status -eq 'ok' -and $standards.crop_label -eq 'Wheat' -and $options.crops.Count -ge 9) {
                Write-Host "SeedGuard is running at http://127.0.0.1:$port/"
                Write-Host 'The server runs in the background; you can close this PowerShell window.'
                exit 0
            }
        } catch {
            # Keep waiting while Uvicorn starts.
        }
    }

    if (Test-Path $stderrLog) {
        $lastOutput = (Get-Content $stderrLog -Tail 12) -join [Environment]::NewLine
    }
    if (-not $server.HasExited) {
        Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    }
}

throw "SeedGuard did not become ready on ports 8000 through 8003. Server output:`n$lastOutput"
