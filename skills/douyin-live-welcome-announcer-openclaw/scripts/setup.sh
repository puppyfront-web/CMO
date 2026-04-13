#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
RUNTIME_DIR="$SKILL_DIR/runtime"
VENV_DIR="$RUNTIME_DIR/.venv-edge-tts"

cd "$RUNTIME_DIR"

echo "[douyin-live-welcome] Installing Node dependencies..."
npm install

echo "[douyin-live-welcome] Installing Playwright Chromium..."
npx playwright install chromium

echo "[douyin-live-welcome] Preparing edge-tts virtualenv..."
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install edge-tts

echo "[douyin-live-welcome] Ready."
