import { describe, expect, it } from "vitest";

import {
  COMPLEXITY_FLAGS,
  DOCUMENT_STATES,
  EXECUTION_MODES,
} from "../src/domain/execution.js";
import { createBillDocument } from "../src/domain/bill-document.js";
import { createBillTypeTemplate } from "../src/domain/bill-template.js";
import { createExcelTemplateMapping } from "../src/domain/excel-mapping.js";
import { createReviewTask } from "../src/domain/review-task.js";

describe("domain contracts", () => {
  it("exposes the supported state and mode values", () => {
    expect(DOCUMENT_STATES).toEqual([
      "UPLOADED",
      "PREPROCESSED",
      "PARSED",
      "EXTRACTED",
      "VALIDATED",
      "AUTO_WRITE",
      "REVIEW_REQUIRED",
      "TYPE_ONBOARDING",
      "WRITTEN",
      "REJECTED",
    ]);

    expect(EXECUTION_MODES).toEqual([
      "new_entry",
      "backfill",
      "repair",
      "batch_process",
      "type_onboarding",
      "manual_review",
    ]);

    expect(COMPLEXITY_FLAGS).toEqual([
      "clean_printed",
      "printed_with_handwriting",
      "override_detected",
      "uncertain_document",
    ]);
  });

  it("creates a bill document with replay-friendly defaults", () => {
    const document = createBillDocument({
      doc_id: "doc-001",
      file_url: "file:///tmp/doc-001.png",
      source_filename: "doc-001.png",
    });

    expect(document.doc_id).toBe("doc-001");
    expect(document.status).toBe("UPLOADED");
    expect(document.intent).toBe("new_entry");
    expect(document.doc_hash).toBeNull();
    expect(document.template_candidates).toEqual([]);
    expect(document.validation).toEqual({
      is_valid: false,
      warnings: [],
      missing_fields: [],
    });
    expect(document.audit.created_at).toMatch(/T/);
    expect(document.audit.updated_at).toMatch(/T/);
  });

  it("creates a versioned bill type template and excel mapping", () => {
    const template = createBillTypeTemplate({
      type_id: "fabric_sales_v1",
      features: {
        keywords: ["销货清单", "旺泰"],
        layout_patterns: [],
        table_headers: ["品名", "数量", "单价"],
      },
      field_mapping: {
        total_amount: ["金额", "合计"],
      },
      table_schema: [
        { source: "品名", target: "item_name" },
      ],
      excel_mapping_id: "fabric_excel_v1",
      confidence_threshold: 0.8,
    });

    const mapping = createExcelTemplateMapping({
      template_id: "fabric_excel_v1",
      sheet: "Sheet1",
      mapping: {
        A: "bill_date",
        B: "vendor_name",
        C: "items[].item_name",
      },
      mode: "expand_items",
    });

    expect(template.version).toBe(1);
    expect(template.post_rules).toEqual([]);
    expect(mapping.mode).toBe("expand_items");
    expect(mapping.start_row).toBe(2);
  });

  it("creates review tasks with deterministic defaults", () => {
    const reviewTask = createReviewTask({
      task_id: "review-001",
      doc_id: "doc-001",
      reason: "low_confidence",
      fields_to_review: ["total_amount"],
    });

    expect(reviewTask.status).toBe("pending");
    expect(reviewTask.candidate_values).toEqual({});
    expect(reviewTask.evidence).toEqual({});
    expect(reviewTask.corrections).toEqual({});
  });
});
