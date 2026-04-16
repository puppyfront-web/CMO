#!/usr/bin/env python3
import sys


def normalize(value: str) -> str:
    return value.strip().replace("/", "-").replace(" ", "")


def build_title(customer: str, industry: str, label: str, date: str) -> str:
    customer = normalize(customer)
    industry = normalize(industry)
    label = normalize(label)
    date = normalize(date)
    if customer and industry:
        return f"{customer}-{industry}-{label}-{date}"
    if customer:
        return f"{customer}-{label}-{date}"
    if industry:
        return f"{industry}-{label}-{date}"
    return f"{label}-{date}"


def main(argv: list[str]) -> int:
    if len(argv) != 5:
        print("usage: linked_doc_title.py <customer> <industry> <label> <date>", file=sys.stderr)
        return 1
    print(build_title(argv[1], argv[2], argv[3], argv[4]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
