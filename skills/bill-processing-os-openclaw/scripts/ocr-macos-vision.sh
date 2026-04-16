#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
Usage: ocr-macos-vision.sh <image-path>

Runs Apple's Vision OCR locally on macOS and writes plain-text transcript to stdout.
EOF
  exit 0
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ocr-macos-vision.sh 仅支持 macOS。" >&2
  exit 1
fi

exec /usr/bin/swift "$SCRIPT_DIR/ocr-macos-vision.swift" "$@"
