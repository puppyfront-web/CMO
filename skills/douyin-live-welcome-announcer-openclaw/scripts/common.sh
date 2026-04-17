#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GLOBAL_SKILLS_DIR="${OPENCLAW_GLOBAL_SKILLS_DIR:-$HOME/.openclaw/workspace/skills}"
GLOBAL_LINK_PATH="$GLOBAL_SKILLS_DIR/douyin-live-welcome-announcer-openclaw"
