#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
RUNTIME_DIR="$SKILL_DIR/runtime"

LIVE_URL="${1:-${DOUYIN_LIVE_URL:-}}"
ENGINE="${DOUYIN_TTS_ENGINE:-auto}"
EDGE_VOICE="${DOUYIN_EDGE_VOICE:-zh-CN-XiaoxiaoNeural}"
SAY_VOICE="${DOUYIN_SAY_VOICE:-Tingting}"
TEMPLATE="${DOUYIN_TEMPLATE:-感谢{nickname}送的{gift}，比心}"

if [[ -z "${LIVE_URL// }" ]]; then
  echo "必须提供直播间链接，例如：bash \"$SKILL_DIR/scripts/run.sh\" \"https://live.douyin.com/你的直播间\"" >&2
  exit 1
fi

cd "$RUNTIME_DIR"

exec npm run watch -- \
  --url "$LIVE_URL" \
  --engine "$ENGINE" \
  --edge-voice "$EDGE_VOICE" \
  --say-voice "$SAY_VOICE" \
  --template "$TEMPLATE"
