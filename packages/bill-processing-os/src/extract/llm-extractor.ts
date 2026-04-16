import type { BillDocument } from "../domain/bill-document.js";
import type { BillTypeTemplate } from "../domain/bill-template.js";

export type ExtractionSource = "markdown" | "ocr" | "handwriting";

export interface ExtractionCandidate {
  source: ExtractionSource;
  value: string;
  confidence: number;
  evidence: string;
}

export type ExtractionCandidateMap = Record<string, ExtractionCandidate[]>;

export interface BillExtractionDraft {
  fields: ExtractionCandidateMap;
  items: Array<Record<string, ExtractionCandidate[]>>;
}

const DEFAULT_FIELD_ALIASES: Record<string, string[]> = {
  bill_date: ["bill_date", "date", "开票日期", "日期"],
  vendor_name: ["vendor_name", "supplier", "vendor", "卖方", "供应商"],
  customer_name: ["customer_name", "客户", "买方", "采购方"],
  total_amount: ["total_amount", "合计", "总金额", "金额"],
  currency: ["currency", "币种", "货币"],
};

export function extractBillDraft(
  document: BillDocument,
  template?: BillTypeTemplate | null,
): BillExtractionDraft {
  const fieldNames = collectFieldNames(template);
  const markdown = document.raw.markdown ?? "";
  const ocrText = document.raw.ocr_text ?? "";

  const fields: ExtractionCandidateMap = {};

  for (const fieldName of fieldNames) {
    const aliases = collectAliases(fieldName, template);
    const candidates = [
      ...extractFieldCandidatesFromText(fieldName, markdown, aliases, "markdown"),
      ...extractFieldCandidatesFromText(fieldName, ocrText, aliases, "ocr"),
      ...extractFieldCandidatesFromHandwriting(fieldName, document, aliases),
    ];

    if (candidates.length > 0) {
      fields[fieldName] = candidates;
    }
  }

  if (!fields.currency) {
    const currencyCandidate = inferCurrencyCandidate(markdown, ocrText);
    if (currencyCandidate) {
      fields.currency = [currencyCandidate];
    }
  }

  const items = parseItems(document, template);

  return {
    fields,
    items,
  };
}

function collectFieldNames(template?: BillTypeTemplate | null): string[] {
  const names = new Set<string>(Object.keys(DEFAULT_FIELD_ALIASES));

  if (template) {
    for (const key of Object.keys(template.field_mapping)) {
      names.add(key);
    }
  }

  return [...names];
}

function collectAliases(fieldName: string, template?: BillTypeTemplate | null): string[] {
  const aliases = new Set<string>(DEFAULT_FIELD_ALIASES[fieldName] ?? [fieldName]);
  aliases.add(fieldName);

  if (template?.field_mapping[fieldName]) {
    for (const alias of template.field_mapping[fieldName]) {
      aliases.add(alias);
    }
  }

  return [...aliases];
}

function extractFieldCandidatesFromText(
  fieldName: string,
  text: string,
  aliases: string[],
  source: ExtractionSource,
): ExtractionCandidate[] {
  const candidates: ExtractionCandidate[] = [];
  const lines = text.split(/\r?\n/);

  for (const alias of aliases) {
    for (const line of lines) {
      const value = extractValueAfterLabel(line, alias);
      if (value) {
        candidates.push({
          source,
          value: fieldName === "bill_date" ? normalizeDateString(value) ?? value : value,
          confidence: source === "markdown" ? 1 : 0.92,
          evidence: line.trim(),
        });
      }
    }
  }

  if (fieldName === "bill_date") {
    const date = extractLooseDate(text);
    if (date) {
      candidates.push({
        source,
        value: date,
        confidence: source === "markdown" ? 0.98 : 0.9,
        evidence: date,
      });
    }
  }

  return dedupeCandidates(candidates);
}

function extractFieldCandidatesFromHandwriting(
  fieldName: string,
  document: BillDocument,
  aliases: string[],
): ExtractionCandidate[] {
  const annotations = document.handwriting.annotations ?? [];
  const candidates: ExtractionCandidate[] = [];

  for (const annotation of annotations) {
    const annotationField = String(annotation.field ?? annotation.name ?? "");
    const annotationValue = annotation.value;

    if (!annotationValue) {
      continue;
    }

    if (!aliases.includes(annotationField)) {
      continue;
    }

    const rawValue = String(annotationValue);
    candidates.push({
      source: "handwriting",
      value: fieldName === "bill_date" ? normalizeDateString(rawValue) ?? rawValue : rawValue,
      confidence: typeof annotation.confidence === "number" ? annotation.confidence : 1,
      evidence: String(annotation.evidence ?? rawValue),
    });
  }

  return candidates;
}

function inferCurrencyCandidate(markdown: string, ocrText: string): ExtractionCandidate | null {
  const text = `${markdown}\n${ocrText}`;

  if (/人民币|￥|¥/.test(text)) {
    return {
      source: "markdown",
      value: "CNY",
      confidence: 0.95,
      evidence: "inferred from currency symbol",
    };
  }

  if (/\bUSD\b/.test(text)) {
    return {
      source: "ocr",
      value: "USD",
      confidence: 0.95,
      evidence: "inferred from currency code",
    };
  }

  return null;
}

function parseItems(
  document: BillDocument,
  template?: BillTypeTemplate | null,
): Array<Record<string, ExtractionCandidate[]>> {
  const markdownRows = parseMarkdownTableRows(document.raw.markdown ?? "", template);
  if (markdownRows.length > 0) {
    return markdownRows;
  }

  return parseLooseItemRows(document.raw.ocr_text ?? "");
}

function parseMarkdownTableRows(
  markdown: string,
  template?: BillTypeTemplate | null,
): Array<Record<string, ExtractionCandidate[]>> {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (lines.length < 2) {
    return [];
  }

  const headerCells = splitMarkdownRow(lines[0]);
  const dataLines = lines.slice(1).filter((line) => !/^(\|\s*:?-{3,}:?\s*)+\|?$/.test(line));
  const schema = new Map<string, string>();

  for (const mapping of template?.table_schema ?? []) {
    schema.set(mapping.source, mapping.target);
  }

  const rows: Array<Record<string, ExtractionCandidate[]>> = [];

  for (const line of dataLines) {
    const cells = splitMarkdownRow(line);
    if (cells.length === 0) {
      continue;
    }

    const row: Record<string, ExtractionCandidate[]> = {};
    for (let index = 0; index < cells.length; index += 1) {
      const header = headerCells[index];
      if (!header) {
        continue;
      }

      const target = schema.get(header) ?? normalizeHeader(header);
      row[target] = [
        {
          source: "markdown",
          value: cells[index],
          confidence: 1,
          evidence: line,
        },
      ];
    }

    if (Object.keys(row).length > 0) {
      rows.push(row);
    }
  }

  return rows;
}

function parseLooseItemRows(text: string): Array<Record<string, ExtractionCandidate[]>> {
  const rows: Array<Record<string, ExtractionCandidate[]>> = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 4) {
      continue;
    }

    const amount = tokens[tokens.length - 1];
    const unitPrice = tokens[tokens.length - 2];
    const quantity = tokens[tokens.length - 3];
    const name = tokens.slice(0, -3).join(" ");

    if (!isNumericToken(quantity) || !isNumericToken(unitPrice) || !isNumericToken(amount)) {
      continue;
    }

    rows.push({
      item_name: [
        {
          source: "ocr",
          value: name,
          confidence: 0.9,
          evidence: line,
        },
      ],
      quantity: [
        {
          source: "ocr",
          value: quantity,
          confidence: 0.9,
          evidence: line,
        },
      ],
      unit_price: [
        {
          source: "ocr",
          value: unitPrice,
          confidence: 0.9,
          evidence: line,
        },
      ],
      amount: [
        {
          source: "ocr",
          value: amount,
          confidence: 0.9,
          evidence: line,
        },
      ],
    });
  }

  return rows;
}

function splitMarkdownRow(row: string): string[] {
  return row
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function normalizeHeader(header: string): string {
  const compact = header.replace(/\s+/g, "");

  if (compact === "品名" || compact === "名称") {
    return "item_name";
  }

  if (compact === "数量") {
    return "quantity";
  }

  if (compact === "单价" || compact === "价格") {
    return "unit_price";
  }

  if (compact === "金额" || compact === "小计") {
    return "amount";
  }

  return compact;
}

function extractValueAfterLabel(line: string, alias: string): string | null {
  const normalizedAlias = escapeRegExp(alias);
  const match = line.match(new RegExp(`(?:^|\\b)${normalizedAlias}\\s*[:：]\\s*(.+)$`));
  if (match?.[1]) {
    return match[1].trim();
  }

  const looseMatch = line.match(new RegExp(`(?:^|\\b)${normalizedAlias}\\s+(.+)$`));
  if (looseMatch?.[1]) {
    return looseMatch[1].trim();
  }

  return null;
}

function extractLooseDate(text: string): string | null {
  const candidates = [
    text.match(/(\d{4})[年\/.-](\d{1,2})[月\/.-](\d{1,2})日?/),
    text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/),
  ];

  for (const match of candidates) {
    if (!match) {
      continue;
    }

    const year = match[1];
    const month = match[2].padStart(2, "0");
    const day = match[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return null;
}

function normalizeDateString(value: string): string | null {
  const extracted = extractLooseDate(value);
  if (extracted) {
    return extracted;
  }

  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }

  return null;
}

function dedupeCandidates(candidates: ExtractionCandidate[]): ExtractionCandidate[] {
  const seen = new Set<string>();
  const deduped: ExtractionCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.source}|${candidate.value}|${candidate.evidence}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function isNumericToken(value: string): boolean {
  return /^[0-9]+(?:\.[0-9]+)?$/.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
