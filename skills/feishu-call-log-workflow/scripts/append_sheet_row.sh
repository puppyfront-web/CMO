#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: append_sheet_row.sh <sheet-url> <json-row-array>" >&2
  exit 1
fi

SHEET_URL="$1"
ROW_JSON="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

ensure_node_env
VALIDATED_ROW_JSON="$(/usr/bin/python3 "$SCRIPT_DIR/validate_row.py" validate "$ROW_JSON")"
lark-cli sheets +append --url "$SHEET_URL" --values "[$VALIDATED_ROW_JSON]"
