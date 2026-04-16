#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
RUNTIME_DIR="$SKILL_DIR/runtime"
INVOKE_CWD="$PWD"

INPUT_PATH="${1:-${BILL_INPUT_PATH:-}}"
HOME_DIR="${BILL_HOME_DIR:-}"
JSON_OUTPUT="${BILL_JSON_OUTPUT:-0}"

to_abs_path() {
  local value="$1"
  if [[ "$value" == /* ]]; then
    printf '%s\n' "$value"
  else
    printf '%s\n' "$INVOKE_CWD/$value"
  fi
}

if [[ -z "${INPUT_PATH// }" ]]; then
  echo "必须提供 JSON 票据源文件路径或目录路径，例如：bash \"$SKILL_DIR/scripts/run.sh\" \"/absolute/path/to/bill.json\"" >&2
  exit 1
fi

INPUT_PATH="$(to_abs_path "$INPUT_PATH")"
shift || true

cd "$RUNTIME_DIR"

CMD=(npm run run -- --input "$INPUT_PATH")

if [[ -n "${HOME_DIR// }" ]]; then
  CMD+=(--home-dir "$HOME_DIR")
fi

if [[ "$JSON_OUTPUT" == "1" ]]; then
  CMD+=(--json)
fi

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --template-bundle|--excel-out|--ocr-command)
      if [[ "$#" -lt 2 ]]; then
        echo "参数 $1 需要跟一个路径值" >&2
        exit 1
      fi
      CMD+=("$1" "$(to_abs_path "$2")")
      shift 2
      ;;
    *)
      CMD+=("$1")
      shift
      ;;
  esac
done

exec "${CMD[@]}"
