#!/usr/bin/env python3
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SCHEMA = ROOT / "schema.py"


def load_headers() -> list[str]:
    raw = __import__("subprocess").check_output(
        ["/usr/bin/python3", str(SCHEMA), "headers"], text=True
    ).strip()
    parsed = json.loads(raw)
    if not isinstance(parsed, list) or not all(isinstance(item, str) for item in parsed):
        raise ValueError("schema headers must be a string array")
    return parsed


def validate_row(raw_row: str) -> list[object]:
    parsed = json.loads(raw_row)
    if not isinstance(parsed, list):
        raise ValueError("row must be a JSON array")

    headers = load_headers()
    if len(parsed) != len(headers):
        raise ValueError(
            f"row column count mismatch: expected {len(headers)} columns "
            f"({', '.join(headers)}), got {len(parsed)}"
        )
    return parsed


def main(argv: list[str]) -> int:
    if len(argv) != 3 or argv[1] != "validate":
        print("usage: validate_row.py validate <json-row-array>", file=sys.stderr)
        return 1

    try:
        row = validate_row(argv[2])
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1

    print(json.dumps(row, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
