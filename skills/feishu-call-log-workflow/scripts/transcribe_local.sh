#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: transcribe_local.sh <audio-path>" >&2
  exit 1
fi

AUDIO_PATH="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

ensure_node_env
ensure_state_dir

if [ ! -f "$AUDIO_PATH" ]; then
  echo "audio file not found: $AUDIO_PATH" >&2
  exit 1
fi

if [ ! -f "$TRANSCRIBE_VENV/bin/activate" ]; then
  bash "$SCRIPT_DIR/setup.sh" >/dev/null
fi

OUTPUT_DIR="$STATE_DIR/artifacts/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

# shellcheck source=/dev/null
source "$TRANSCRIBE_VENV/bin/activate"
export PATH="/opt/homebrew/bin:$PATH"
python -m whisper "$AUDIO_PATH" \
  --model small \
  --language Chinese \
  --task transcribe \
  --fp16 False \
  --output_format txt \
  --output_dir "$OUTPUT_DIR" >/dev/null

BASENAME="$(basename "${AUDIO_PATH%.*}")"
TRANSCRIPT_PATH="$OUTPUT_DIR/$BASENAME.txt"
printf '%s\n' "$TRANSCRIPT_PATH"
