#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: create_quotation_sheet.sh <title> <quotation-sheet-data.json>" >&2
  exit 1
fi

TITLE="$1"
DATA_FILE="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

ensure_node_env

if [ ! -f "$DATA_FILE" ]; then
  echo "quotation sheet data file not found: $DATA_FILE" >&2
  exit 1
fi

HEADERS="$(/usr/bin/python3 "$SCRIPT_DIR/quotation_sheet_schema.py" headers)"
DATA="$(/usr/bin/python3 "$SCRIPT_DIR/validate_quotation_sheet_data.py" validate "$DATA_FILE")"
CREATE_RESULT="$(lark-cli sheets +create --title "$TITLE" --headers "$HEADERS" --data "$DATA")"
SHEET_URL="$(printf '%s' "$CREATE_RESULT" | /usr/bin/python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["url"])')"

/usr/bin/python3 - <<'PY' "$SHEET_URL"
import json, sys
print(json.dumps({"sheet_url": sys.argv[1]}, ensure_ascii=False))
PY
