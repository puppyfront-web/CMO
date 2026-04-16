import { describe, expect, it } from "vitest";

import { createBillDocument } from "../src/domain/bill-document.js";
import { createBillTypeTemplate } from "../src/domain/bill-template.js";
import { createReviewTask } from "../src/domain/review-task.js";
import {
  applyReviewCorrections,
  buildReviewTaskFromDocument,
} from "../src/review/bill-review-processor.js";

describe("bill-review-processor", () => {
  it("builds a review task that includes missing fields and evidence", () => {
    const document = createBillDocument({
      doc_id: "doc-201",
      file_url: "file:///tmp/doc-201.png",
      source_filename: "doc-201.png",
    });
    document.validation = {
      is_valid: false,
      warnings: ["low_confidence"],
      missing_fields: ["vendor_name"],
    };

    const reviewTask = buildReviewTaskFromDocument(document, {
      task_id: "review-201",
      reason: "missing_required_field",
      fields_to_review: ["total_amount"],
      candidate_values: {
        vendor_name: ["Acme Trading"],
      },
      evidence: {
        vendor_name: ["OCR line 3"],
      },
    });

    expect(reviewTask.fields_to_review).toEqual([
      "total_amount",
      "vendor_name",
    ]);
    expect(reviewTask.candidate_values.vendor_name).toEqual(["Acme Trading"]);
    expect(reviewTask.evidence.vendor_name).toEqual(["OCR line 3"]);
    expect(reviewTask.status).toBe("pending");
  });

  it("merges corrections back into normalized data and revalidates the document", () => {
    const document = createBillDocument({
      doc_id: "doc-202",
      file_url: "file:///tmp/doc-202.png",
      source_filename: "doc-202.png",
    });
    document.normalized.fields = {
      bill_date: "2026-04-16",
      vendor_name: "",
      total_amount: 120,
    };
    document.normalized.items = [
      {
        item_name: "Notebook",
        quantity: 2,
        amount: 40,
      },
      {
        item_name: "Pen",
        quantity: 3,
        amount: 50,
      },
    ];

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

    const reviewTask = createReviewTask({
      task_id: "review-202",
      doc_id: "doc-202",
      reason: "missing_required_field",
      fields_to_review: ["vendor_name"],
      corrections: {
        "fields.vendor_name": "Acme Trading",
        "items.1.amount": 80,
      },
    });

    const result = applyReviewCorrections(
      document,
      reviewTask,
      reviewTask.corrections,
      template,
    );

    expect(result.document.normalized.fields.vendor_name).toBe("Acme Trading");
    expect(result.document.normalized.items[1].amount).toBe(80);
    expect(result.validation.is_valid).toBe(true);
    expect(result.audit_trail).toHaveLength(2);
    expect(result.review_task.status).toBe("completed");
    expect(result.document.status).toBe("VALIDATED");
  });
});
