import type { BillDocumentParsed } from "../domain/bill-document.js";

export function normalizeBillParsed(parsed: BillDocumentParsed): BillDocumentParsed {
  return {
    fields: normalizeFields(parsed.fields),
    items: parsed.items.map((item) => normalizeFields(item)),
  };
}

function normalizeFields(fields: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [fieldName, value] of Object.entries(fields)) {
    if (value === null || value === undefined) {
      continue;
    }

    normalized[fieldName] = normalizeField(fieldName, value);
  }

  return normalized;
}

function normalizeField(fieldName: string, value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  if (fieldName === "bill_date" || fieldName === "date") {
    return normalizeDate(value) ?? value;
  }

  if (fieldName === "currency") {
    return normalizeCurrency(value);
  }

  if (fieldName === "quantity" || fieldName === "amount" || fieldName === "unit_price" || fieldName === "total_amount") {
    return normalizeNumber(value);
  }

  return value;
}

function normalizeDate(value: string): string | null {
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }

  const chineseMatch = value.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
  if (chineseMatch) {
    return `${chineseMatch[1]}-${chineseMatch[2].padStart(2, "0")}-${chineseMatch[3].padStart(2, "0")}`;
  }

  return null;
}

function normalizeCurrency(value: string): string {
  if (/人民币|CNY|RMB|￥|¥/i.test(value)) {
    return "CNY";
  }

  return value.toUpperCase();
}

function normalizeNumber(value: string): number | string {
  const normalized = value.replace(/[￥¥,\s]/g, "");
  const parsed = Number(normalized);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return value;
}
