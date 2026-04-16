import { describe, expect, it } from "vitest";

import { createBillDocument } from "../src/domain/bill-document.js";
import { createBillTypeTemplate } from "../src/domain/bill-template.js";
import { applyConfidencePolicy } from "../src/validate/confidence-policy.js";
import { buildBillDedupeKey, detectBillDuplicate } from "../src/validate/dedupe-guard.js";
import { routeBillDocument } from "../src/validate/routing-engine.js";
import { validateBillDocument } from "../src/validate/validation-engine.js";

describe("validation pipeline", () => {
  it("flags missing template fields and mismatched row totals", () => {
    const document = createBillDocument({
      doc_id: "doc-001",
      file_url: "file:///tmp/doc-001.png",
      source_filename: "doc-001.png",
    });
    document.normalized.fields = {
      bill_date: "2026-04-16",
      total_amount: 120,
    };
    document.normalized.items = [{ amount: 40 }, { amount: 50 }];

    const template = createBillTypeTemplate({
      type_id: "sales_v1",
      features: {
        keywords: ["销货清单"],
        layout_patterns: [],
        table_headers: ["品名", "金额"],
      },
      field_mapping: {
        bill_date: ["日期"],
        vendor_name: ["供应商"],
        total_amount: ["金额"],
      },
      table_schema: [],
      excel_mapping_id: "sales_excel_v1",
      confidence_threshold: 0.8,
      post_rules: ["require_total_matches_items"],
    });

    const validation = validateBillDocument(document, template);

    expect(validation.is_valid).toBe(false);
    expect(validation.missing_fields).toEqual(["vendor_name"]);
    expect(validation.warnings).toContain("row_total_mismatch");
  });

  it.each([
    [
      "auto write",
      { type_match_score: 0.95, confidence_score: 0.96 },
      "AUTO_WRITE",
    ],
    [
      "user confirm",
      { type_match_score: 0.86, confidence_score: 0.82 },
      "USER_CONFIRM",
    ],
    [
      "review when handwriting overrides",
      {
        type_match_score: 0.97,
        confidence_score: 0.99,
        handwriting_override_detected: true,
      },
      "REVIEW_REQUIRED",
    ],
    [
      "type onboarding",
      { type_match_score: 0.55, confidence_score: 0.99 },
      "TYPE_ONBOARDING",
    ],
  ] as const)("applies the fixed confidence policy for %s", (_label, input, expected) => {
    const policy = applyConfidencePolicy(input);

    expect(policy.decision).toBe(expected);
  });

  it("builds a dedupe key and routes duplicate bills by execution mode", () => {
    const document = createBillDocument({
      doc_id: "doc-002",
      file_url: "file:///tmp/doc-002.png",
      source_filename: "doc-002.png",
    });
    document.doc_hash = "hash-abc";
    document.normalized.fields = {
      bill_date: "2026-04-16",
      total_amount: 120,
    };
    document.normalized.items = [{ amount: 120 }];

    const dedupeKey = buildBillDedupeKey(document);

    expect(dedupeKey).toBe("hash-abc|120|2026-04-16");
    expect(
      detectBillDuplicate(document, [
        {
          doc_hash: "hash-abc",
          total_amount: 120,
          bill_date: "2026-04-16",
        },
      ]).is_duplicate,
    ).toBe(true);

    const validation = {
      is_valid: true,
      warnings: [],
      missing_fields: [],
    };

    expect(
      routeBillDocument({
        document,
        type_match_score: 0.96,
        confidence_score: 0.96,
        validation,
        duplicate_result: {
          is_duplicate: true,
          dedupe_key: dedupeKey,
          matched_index: 0,
        },
        execution_mode: "new_entry",
      }).decision,
    ).toBe("REJECTED");

    expect(
      routeBillDocument({
        document,
        type_match_score: 0.96,
        confidence_score: 0.96,
        validation,
        duplicate_result: {
          is_duplicate: true,
          dedupe_key: dedupeKey,
          matched_index: 0,
        },
        execution_mode: "repair",
      }).decision,
    ).toBe("REVIEW_REQUIRED");
  });
});
