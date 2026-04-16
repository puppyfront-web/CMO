import type { BillDocument } from "../domain/bill-document.js";
import type { BillTypeTemplate } from "../domain/bill-template.js";

export interface BillValidationResult {
  is_valid: boolean;
  warnings: string[];
  missing_fields: string[];
}

function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  return false;
}

function toAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getTemplateRequiredFields(template?: BillTypeTemplate): string[] {
  if (!template) {
    return [];
  }

  return Object.keys(template.field_mapping);
}

function hasTotalMatchRule(template?: BillTypeTemplate): boolean {
  return (
    template?.post_rules.includes("require_total_matches_items") === true ||
    template?.post_rules.includes("sum_items_matches_total") === true
  );
}

export function validateBillDocument(
  document: BillDocument,
  template?: BillTypeTemplate,
): BillValidationResult {
  const warnings: string[] = [];
  const missing_fields: string[] = [];

  for (const field of getTemplateRequiredFields(template)) {
    if (isMissingValue(document.normalized.fields[field])) {
      missing_fields.push(field);
    }
  }

  if (hasTotalMatchRule(template)) {
    const totalAmount = toAmount(document.normalized.fields.total_amount);
    const itemSum = document.normalized.items.reduce((sum, item) => {
      const amount = toAmount(item.amount);
      return amount === null ? sum : sum + amount;
    }, 0);

    if (
      totalAmount !== null &&
      document.normalized.items.length > 0 &&
      Math.abs(itemSum - totalAmount) > 0.01
    ) {
      warnings.push("row_total_mismatch");
    }
  }

  return {
    is_valid: missing_fields.length === 0 && warnings.length === 0,
    warnings,
    missing_fields,
  };
}
