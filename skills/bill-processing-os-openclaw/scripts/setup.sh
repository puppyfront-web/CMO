#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
RUNTIME_DIR="$SKILL_DIR/runtime"
PACKAGE_DIR="$(cd -- "$SKILL_DIR/../../packages/bill-processing-os" && pwd)"

cd "$PACKAGE_DIR"

echo "[bill-processing-os] Installing package dependencies..."
npm install

cd "$RUNTIME_DIR"

echo "[bill-processing-os] Installing runtime dependencies..."
npm install

echo "[bill-processing-os] Ready."
