import { describe, expect, it } from "vitest";

import { createTemplateIndex } from "../src/type-match/template-index.js";
import { matchBillTypes } from "../src/type-match/bill-type-matcher.js";
import { buildBillTemplate } from "../src/template/bill-template-builder.js";
import { createTemplateRepository } from "../src/template/template-repository.js";
import { versionBillTemplate } from "../src/template/template-versioning.js";

describe("template onboarding", () => {
  it("builds a versioned template bundle from confirmed onboarding data", () => {
    const bundle = buildBillTemplate({
      type_id: "fabric_sales_v1",
      normalized: {
        fields: {
          bill_date: "2026-04-01",
          vendor_name: "旺泰",
          total_amount: 1280,
        },
        items: [
          {
            item_name: "布料A",
            quantity: 2,
            unit_price: 100,
          },
          {
            item_name: "布料B",
            quantity: 3,
            unit_price: 260,
          },
        ],
      },
      observed_layout: {
        keywords: ["销货清单", "旺泰"],
        layout_patterns: ["two-column-header"],
        table_headers: ["品名", "数量", "单价"],
      },
      excel_mapping: {
        template_id: "fabric_excel_v1",
        sheet: "Sheet1",
        mapping: {
          A: "bill_date",
          B: "vendor_name",
          C: "items[].item_name",
        },
        mode: "expand_items",
        start_row: 3,
      },
    });

    expect(bundle.template.version).toBe(1);
    expect(bundle.template.excel_mapping_id).toBe("fabric_excel_v1");
    expect(bundle.template.features.keywords).toEqual(["销货清单", "旺泰"]);
    expect(bundle.template.features.table_headers).toEqual([
      "品名",
      "数量",
      "单价",
    ]);
    expect(bundle.template.table_schema).toEqual([
      { source: "品名", target: "item_name" },
      { source: "数量", target: "quantity" },
      { source: "单价", target: "unit_price" },
    ]);
    expect(bundle.excel_mapping.start_row).toBe(3);
  });

  it("versions templates without mutating the original", () => {
    const base = buildBillTemplate({
      type_id: "service_invoice_v1",
      normalized: {
        fields: {
          bill_date: "2026-04-02",
          vendor_name: "咨询公司",
          total_amount: 5000,
        },
        items: [
          {
            item_name: "咨询服务",
            amount: 5000,
          },
        ],
      },
      observed_layout: {
        keywords: ["服务费", "咨询"],
        layout_patterns: ["single-column-summary"],
        table_headers: ["项目", "金额"],
      },
      excel_mapping: {
        template_id: "service_excel_v1",
        sheet: "Summary",
        mapping: {
          A: "bill_date",
          B: "vendor_name",
          C: "total_amount",
        },
        mode: "fixed_cells",
        start_row: 2,
      },
    }).template;

    const versioned = versionBillTemplate(base, {
      confidence_threshold: 0.85,
      post_rules: ["require_manual_review_if_total_missing"],
    });

    expect(base.version).toBe(1);
    expect(base.confidence_threshold).toBe(0.6);
    expect(versioned.version).toBe(2);
    expect(versioned.confidence_threshold).toBe(0.85);
    expect(versioned.post_rules).toEqual([
      "require_manual_review_if_total_missing",
    ]);
  });

  it("stores onboarding output and matches the same type on the second pass", () => {
    const repository = createTemplateRepository();
    const bundle = buildBillTemplate({
      type_id: "fabric_sales_v1",
      normalized: {
        fields: {
          bill_date: "2026-04-01",
          vendor_name: "旺泰",
          total_amount: 1280,
        },
        items: [
          {
            item_name: "布料A",
            quantity: 2,
            unit_price: 100,
          },
        ],
      },
      observed_layout: {
        keywords: ["销货清单", "旺泰"],
        layout_patterns: ["two-column-header"],
        table_headers: ["品名", "数量", "单价"],
      },
      excel_mapping: {
        template_id: "fabric_excel_v1",
        sheet: "Sheet1",
        mapping: {
          A: "bill_date",
          B: "vendor_name",
          C: "items[].item_name",
        },
        mode: "expand_items",
        start_row: 3,
      },
    });

    repository.saveTemplate(bundle.template);
    repository.saveExcelMapping(bundle.excel_mapping);

    const index = createTemplateIndex(repository.listTemplates());
    const result = matchBillTypes(index, {
      text: "旺泰销货清单 品名 数量 单价",
      headers: ["品名", "数量", "单价"],
    });

    expect(repository.getLatestTemplate("fabric_sales_v1")?.version).toBe(1);
    expect(repository.getExcelMapping("fabric_excel_v1")?.sheet).toBe(
      "Sheet1",
    );
    expect(result.action).toBe("MATCH");
    expect(result.candidates[0]?.type_id).toBe("fabric_sales_v1");
  });
});
