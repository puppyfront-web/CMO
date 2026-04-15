#!/usr/bin/env python3
import json
import sys


HEADERS = [
    "日期",
    "客户名",
    "电话",
    "客户类别",
    "需求",
    "对接阶段",
    "打电话录音脑图",
    "备注",
]


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] != "headers":
        print("usage: schema.py headers", file=sys.stderr)
        return 1
    print(json.dumps(HEADERS, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
