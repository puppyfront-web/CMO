#!/usr/bin/env python3
import sys


def normalize(value: str) -> str:
    return value.strip().replace("/", "-").replace(" ", "")


def build_title(customer: str, industry: str, date: str) -> str:
    customer = normalize(customer)
    industry = normalize(industry)
    date = normalize(date)
    if customer and industry:
        return f"{customer}-{industry}-{date}"
    if customer:
        return f"{customer}-通话脑图-{date}"
    if industry:
        return f"{industry}-通话脑图-{date}"
    return f"通话脑图-{date}"


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        print("usage: doc_title.py <customer> <industry> <date>", file=sys.stderr)
        return 1
    print(build_title(argv[1], argv[2], argv[3]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
