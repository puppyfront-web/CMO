#!/usr/bin/env python3
import json
import sys


HEADERS = [
    "方案",
    "版本定位",
    "交付范围",
    "核心功能",
    "技术与集成边界",
    "工期",
    "报价",
    "不包含项",
    "建议适用客户",
    "报价依据",
]


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] != "headers":
        print("usage: quotation_sheet_schema.py headers", file=sys.stderr)
        return 1
    print(json.dumps(HEADERS, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
