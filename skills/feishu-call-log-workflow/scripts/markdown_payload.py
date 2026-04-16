#!/usr/bin/env python3
import os
import sys
from pathlib import Path


SAFETY_MARGIN = 32768
FALLBACK_LIMIT = 131072


def max_payload_bytes() -> int:
    try:
        arg_max = os.sysconf("SC_ARG_MAX")
    except (AttributeError, ValueError):
        arg_max = FALLBACK_LIMIT
    return max(32768, int(arg_max) - SAFETY_MARGIN)


def load_markdown(path: str) -> str:
    file_path = Path(path)
    if not file_path.is_file():
        raise FileNotFoundError(f"markdown file not found: {path}")

    content = file_path.read_text(encoding="utf-8")
    payload_size = len(content.encode("utf-8"))
    limit = max_payload_bytes()
    if payload_size > limit:
        raise ValueError(
            f"markdown payload too large for CLI argument transport: "
            f"{payload_size} bytes exceeds safe limit {limit} bytes"
        )
    return content


def main(argv: list[str]) -> int:
    if len(argv) != 3 or argv[1] != "read":
        print("usage: markdown_payload.py read <markdown-file>", file=sys.stderr)
        return 1

    try:
        content = load_markdown(argv[2])
    except (FileNotFoundError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 1

    sys.stdout.write(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
