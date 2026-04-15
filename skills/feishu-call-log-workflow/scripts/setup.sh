#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

ensure_node_env
ensure_state_dir

if [ ! -d "$TRANSCRIBE_VENV" ]; then
  /usr/bin/python3 -m venv "$TRANSCRIBE_VENV"
fi

# shellcheck source=/dev/null
source "$TRANSCRIBE_VENV/bin/activate"

if python -c 'import whisper' >/dev/null 2>&1; then
  echo "feishu-call-log-workflow ready"
  exit 0
fi

pip install -q --upgrade pip
pip install -q openai-whisper

echo "feishu-call-log-workflow ready"
