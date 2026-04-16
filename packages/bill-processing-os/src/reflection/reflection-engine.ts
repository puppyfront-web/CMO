import type { BillDocument } from "../domain/bill-document.js";

export type ReflectionSeverity = "info" | "warning" | "critical";

export interface ReflectionIssue {
  code: string;
  severity: ReflectionSeverity;
  message: string;
  field?: string;
  row_index?: number;
  suggested_value?: unknown;
}

export interface BillReflectionInput {
  document: BillDocument;
  confidence_score: number;
}

export interface BillReflectionResult {
  document: BillDocument;
  issues: ReflectionIssue[];
  auto_fixes: string[];
  adjusted_confidence_score: number;
  force_review: boolean;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const normalized = value.replace(/[￥¥,\s]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function clampConfidence(value: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return Number(value.toFixed(4));
}

export function runBillReflection(input: BillReflectionInput): BillReflectionResult {
  const document: BillDocument = structuredClone(input.document);
  const issues: ReflectionIssue[] = [];
  const auto_fixes: string[] = [];
  let adjusted_confidence_score = input.confidence_score;
  let force_review = false;

  const itemTotals = document.normalized.items
    .map((item, rowIndex) => {
      const amount = toNumber(item.amount);
      const quantity = toNumber(item.quantity);
      const unitPrice = toNumber(item.unit_price);
      const computed = quantity !== null && unitPrice !== null ? quantity * unitPrice : null;

      if (amount !== null && computed !== null && Math.abs(amount - computed) > 0.01) {
        issues.push({
          code: "row_amount_mismatch",
          severity: "critical",
          message: "Row amount does not match quantity * unit price.",
          field: "amount",
          row_index: rowIndex,
          suggested_value: Number(computed.toFixed(2)),
        });
        force_review = true;
        adjusted_confidence_score -= 0.35;
      }

      return amount ?? computed;
    })
    .filter((value): value is number => value !== null);

  const itemSum = Number(itemTotals.reduce((sum, value) => sum + value, 0).toFixed(2));
  const totalAmount = toNumber(document.normalized.fields.total_amount);

  if (totalAmount === null && itemTotals.length > 0) {
    document.normalized.fields.total_amount = itemSum;
    issues.push({
      code: "missing_total_amount",
      severity: "warning",
      message: "Filled total_amount from line-item totals during reflection.",
      field: "total_amount",
      suggested_value: itemSum,
    });
    auto_fixes.push("total_amount_from_items");
    adjusted_confidence_score -= 0.05;
  } else if (totalAmount !== null && itemTotals.length > 0 && Math.abs(totalAmount - itemSum) > 0.01) {
    issues.push({
      code: "total_amount_mismatch",
      severity: "critical",
      message: "Declared total amount does not match the line-item sum.",
      field: "total_amount",
      suggested_value: itemSum,
    });
    force_review = true;
    adjusted_confidence_score -= 0.35;
  }

  return {
    document,
    issues,
    auto_fixes,
    adjusted_confidence_score: clampConfidence(adjusted_confidence_score),
    force_review,
  };
}
