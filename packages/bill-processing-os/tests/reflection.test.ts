import { describe, expect, it } from "vitest";

import { createBillDocument } from "../src/domain/bill-document.js";
import { runBillReflection } from "../src/reflection/reflection-engine.js";

function makeDocument() {
  const document = createBillDocument({
    doc_id: "doc-reflection",
    file_url: "file:///tmp/doc-reflection.json",
    source_filename: "doc-reflection.json",
  });

  document.status = "EXTRACTED";
  document.normalized = {
    fields: {
      bill_date: "2026-04-01",
      vendor_name: "旺泰",
    },
    items: [
      { item_name: "布料A", quantity: 2, unit_price: 100, amount: 200 },
      { item_name: "布料B", quantity: 3, unit_price: 360, amount: 1080 },
    ],
  };

  return document;
}

describe("bill reflection", () => {
  it("auto-fills a missing total amount from consistent item totals", () => {
    const document = makeDocument();

    const result = runBillReflection({
      document,
      confidence_score: 0.93,
    });

    expect(result.document.normalized.fields.total_amount).toBe(1280);
    expect(result.auto_fixes).toEqual(["total_amount_from_items"]);
    expect(result.force_review).toBe(false);
    expect(result.adjusted_confidence_score).toBeLessThan(0.93);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "missing_total_amount",
        severity: "warning",
        suggested_value: 1280,
      }),
    ]);
  });

  it("forces review when provided totals conflict with row math", () => {
    const document = makeDocument();
    document.normalized.fields.total_amount = 500;

    const result = runBillReflection({
      document,
      confidence_score: 0.95,
    });

    expect(result.force_review).toBe(true);
    expect(result.adjusted_confidence_score).toBeLessThan(0.7);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "total_amount_mismatch",
        severity: "critical",
      }),
    ]);
  });
});
