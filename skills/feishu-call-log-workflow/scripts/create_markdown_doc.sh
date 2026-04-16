#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: create_markdown_doc.sh <title> <markdown-file>" >&2
  exit 1
fi

TITLE="$1"
MARKDOWN_FILE="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

ensure_node_env

if [ ! -f "$MARKDOWN_FILE" ]; then
  echo "markdown file not found: $MARKDOWN_FILE" >&2
  exit 1
fi

MARKDOWN_CONTENT="$(/usr/bin/python3 "$SCRIPT_DIR/markdown_payload.py" read "$MARKDOWN_FILE")"
CREATE_RESULT="$(lark-cli docs +create --title "$TITLE" --markdown "$MARKDOWN_CONTENT")"
DOC_URL="$(printf '%s' "$CREATE_RESULT" | /usr/bin/python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["doc_url"])')"

/usr/bin/python3 - <<'PY' "$DOC_URL"
import json, sys
print(json.dumps({"doc_url": sys.argv[1]}, ensure_ascii=False))
PY
