#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_DIR="${OPENCLAW_SKILL_STATE_DIR:-$HOME/.openclaw/skill-state/feishu-call-log-workflow}"
STATE_FILE="$STATE_DIR/config.json"
GLOBAL_SKILLS_DIR="${OPENCLAW_GLOBAL_SKILLS_DIR:-$HOME/.openclaw/workspace/skills}"
GLOBAL_LINK_PATH="$GLOBAL_SKILLS_DIR/feishu-call-log-workflow"
TRANSCRIBE_VENV="${OPENCLAW_CALL_LOG_VENV:-$STATE_DIR/venv}"

ensure_node_env() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "/opt/homebrew/opt/nvm/nvm.sh"
  fi
  export PATH="$HOME/.local/npm-global/bin:/opt/homebrew/bin:$PATH"
}

ensure_state_dir() {
  mkdir -p "$STATE_DIR"
}
