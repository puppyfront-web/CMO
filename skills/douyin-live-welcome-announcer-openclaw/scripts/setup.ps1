$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillDir = Split-Path -Parent $ScriptDir
$RuntimeDir = Join-Path $SkillDir "runtime"
$VenvDir = Join-Path $RuntimeDir ".venv-edge-tts"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

Set-Location $RuntimeDir

Write-Host "[douyin-live-welcome] Installing Node dependencies..."
npm install

Write-Host "[douyin-live-welcome] Installing Playwright Chromium..."
npx playwright install chromium

Write-Host "[douyin-live-welcome] Preparing edge-tts virtualenv..."
python3 -m venv $VenvDir
& $PythonExe -m pip install --upgrade pip
& $PythonExe -m pip install edge-tts

Write-Host "[douyin-live-welcome] Ready."
