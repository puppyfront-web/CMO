#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: create_mindmap_doc.sh <title> <mindmap.mmd>" >&2
  exit 1
fi

TITLE="$1"
MMD_PATH="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

ensure_node_env

CREATE_RESULT="$(lark-cli docs +create --title "$TITLE" --markdown '<whiteboard type="blank"></whiteboard>')"
DOC_URL="$(printf '%s' "$CREATE_RESULT" | /usr/bin/python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["doc_url"])')"
BOARD_TOKEN="$(printf '%s' "$CREATE_RESULT" | /usr/bin/python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["board_tokens"][0])')"

npx -y @larksuite/whiteboard-cli@^0.1.0 --to openapi -i "$MMD_PATH" --format json | \
  lark-cli docs +whiteboard-update --whiteboard-token "$BOARD_TOKEN" --yes --as user >/dev/null

/usr/bin/python3 - <<'PY' "$DOC_URL" "$BOARD_TOKEN"
import json, sys
print(json.dumps({"doc_url": sys.argv[1], "board_token": sys.argv[2]}, ensure_ascii=False))
PY
