#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path


def state_paths() -> tuple[Path, Path]:
    state_dir = Path(
        os.environ.get(
            "OPENCLAW_SKILL_STATE_DIR",
            os.path.expanduser("~/.openclaw/skill-state/feishu-call-log-workflow"),
        )
    )
    return state_dir, state_dir / "config.json"


def load_state() -> dict:
    _, state_file = state_paths()
    if not state_file.exists():
        return {}
    return json.loads(state_file.read_text(encoding="utf-8"))


def save_state(data: dict) -> None:
    state_dir, state_file = state_paths()
    state_dir.mkdir(parents=True, exist_ok=True)
    state_file.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def cmd_get_sheet() -> int:
    state = load_state()
    value = state.get("default_sheet_url", "")
    if value:
        print(value)
    return 0


def cmd_set_sheet(url: str) -> int:
    state = load_state()
    state["default_sheet_url"] = url
    save_state(state)
    print(url)
    return 0


def cmd_clear_sheet() -> int:
    state = load_state()
    state.pop("default_sheet_url", None)
    save_state(state)
    return 0


def cmd_show() -> int:
    state = load_state()
    print(json.dumps(state, ensure_ascii=False, indent=2))
    return 0


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: state.py <get-sheet|set-sheet|clear-sheet|show> [value]", file=sys.stderr)
        return 1

    command = argv[1]
    if command == "get-sheet":
        return cmd_get_sheet()
    if command == "set-sheet":
        if len(argv) < 3:
            print("missing sheet url", file=sys.stderr)
            return 1
        return cmd_set_sheet(argv[2])
    if command == "clear-sheet":
        return cmd_clear_sheet()
    if command == "show":
        return cmd_show()

    print(f"unknown command: {command}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
