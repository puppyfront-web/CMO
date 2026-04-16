#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SCHEMA = ROOT / "quotation_sheet_schema.py"


def load_headers() -> list[str]:
    raw = subprocess.check_output(
        ["/usr/bin/python3", str(SCHEMA), "headers"], text=True
    ).strip()
    parsed = json.loads(raw)
    if not isinstance(parsed, list) or not all(isinstance(item, str) for item in parsed):
        raise ValueError("quotation sheet headers must be a string array")
    return parsed


def validate_table(path: str) -> list[list[object]]:
    raw = Path(path).read_text(encoding="utf-8")
    parsed = json.loads(raw)
    if not isinstance(parsed, list) or not all(isinstance(row, list) for row in parsed):
        raise ValueError("quotation sheet data must be a JSON 2D array")

    headers = load_headers()
    for index, row in enumerate(parsed, start=1):
        if len(row) != len(headers):
            raise ValueError(
                f"quotation row {index} column count mismatch: expected {len(headers)} columns "
                f"({', '.join(headers)}), got {len(row)}"
            )
    return parsed


def main(argv: list[str]) -> int:
    if len(argv) != 3 or argv[1] != "validate":
        print("usage: validate_quotation_sheet_data.py validate <json-2d-array-file>", file=sys.stderr)
        return 1

    try:
        table = validate_table(argv[2])
    except (FileNotFoundError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 1

    print(json.dumps(table, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
