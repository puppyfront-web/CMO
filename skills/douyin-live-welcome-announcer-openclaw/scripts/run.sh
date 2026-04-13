#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
RUNTIME_DIR="$SKILL_DIR/runtime"

LIVE_URL="${1:-${DOUYIN_LIVE_URL:-https://live.douyin.com/}}"
ENGINE="${DOUYIN_TTS_ENGINE:-auto}"
EDGE_VOICE="${DOUYIN_EDGE_VOICE:-zh-CN-XiaoxiaoNeural}"
SAY_VOICE="${DOUYIN_SAY_VOICE:-Tingting}"
TEMPLATE="${DOUYIN_TEMPLATE:-欢迎 {nickname} 来到直播间}"

cd "$RUNTIME_DIR"

exec npm run watch -- \
  --url "$LIVE_URL" \
  --engine "$ENGINE" \
  --edge-voice "$EDGE_VOICE" \
  --say-voice "$SAY_VOICE" \
  --template "$TEMPLATE"
