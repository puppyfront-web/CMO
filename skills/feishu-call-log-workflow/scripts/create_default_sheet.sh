#!/usr/bin/env bash
set -euo pipefail

TITLE="${1:-客户通话录音分析}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

ensure_node_env

HEADERS="$(/usr/bin/python3 "$SCRIPT_DIR/schema.py" headers)"
RESULT="$(lark-cli sheets +create --title "$TITLE" --headers "$HEADERS")"
URL="$(printf '%s' "$RESULT" | /usr/bin/python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["url"])')"
/usr/bin/python3 "$SCRIPT_DIR/state.py" set-sheet "$URL" >/dev/null
printf '%s\n' "$URL"
