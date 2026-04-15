#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

if [ -e "$GLOBAL_LINK_PATH" ] || [ -L "$GLOBAL_LINK_PATH" ]; then
  rm -rf "$GLOBAL_LINK_PATH"
fi

echo "removed $GLOBAL_LINK_PATH"
