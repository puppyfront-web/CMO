#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

mkdir -p "$GLOBAL_SKILLS_DIR"

if [ -e "$GLOBAL_LINK_PATH" ] || [ -L "$GLOBAL_LINK_PATH" ]; then
  rm -rf "$GLOBAL_LINK_PATH"
fi

ln -s "$SKILL_DIR" "$GLOBAL_LINK_PATH"
echo "$GLOBAL_LINK_PATH"
