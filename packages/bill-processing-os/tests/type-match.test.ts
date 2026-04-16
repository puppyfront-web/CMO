import { describe, expect, it } from "vitest";

import { createBillTypeTemplate } from "../src/domain/bill-template.js";
import { createTemplateIndex } from "../src/type-match/template-index.js";
import { matchBillTypes } from "../src/type-match/bill-type-matcher.js";

function makeTemplates() {
  return [
    createBillTypeTemplate({
      type_id: "fabric_sales_v1",
      features: {
        keywords: ["销货清单", "旺泰"],
        layout_patterns: ["two-column-header"],
        table_headers: ["品名", "数量", "单价"],
      },
      field_mapping: {
        total_amount: ["合计", "金额"],
      },
      table_schema: [
        { source: "品名", target: "item_name" },
        { source: "数量", target: "quantity" },
        { source: "单价", target: "unit_price" },
      ],
      excel_mapping_id: "fabric_excel_v1",
      confidence_threshold: 0.8,
    }),
    createBillTypeTemplate({
      type_id: "service_invoice_v1",
      features: {
        keywords: ["服务费", "咨询"],
        layout_patterns: ["single-column-summary"],
        table_headers: ["项目", "金额"],
      },
      field_mapping: {
        total_amount: ["金额"],
      },
      table_schema: [
        { source: "项目", target: "item_name" },
        { source: "金额", target: "amount" },
      ],
      excel_mapping_id: "service_excel_v1",
      confidence_threshold: 0.75,
    }),
  ];
}

describe("type matching", () => {
  it("returns a confident hit for a known template", () => {
    const index = createTemplateIndex(makeTemplates());
    const result = matchBillTypes(index, {
      text: "旺泰销货清单 品名 数量 单价",
      headers: ["品名", "数量", "单价"],
    });

    expect(result.action).toBe("MATCH");
    expect(result.type_match).toBeGreaterThan(0.9);
    expect(result.candidates[0]?.type_id).toBe("fabric_sales_v1");
    expect(result.candidates[0]?.score).toBeGreaterThan(
      result.candidates[1]?.score ?? -1,
    );
  });

  it("marks a near-match as ambiguous without onboarding", () => {
    const templates = makeTemplates();
    templates.push(
      createBillTypeTemplate({
        type_id: "fabric_sales_alt_v1",
        features: {
          keywords: ["销货", "旺泰"],
          layout_patterns: ["two-column-header"],
          table_headers: ["品名", "数量"],
        },
        field_mapping: {
          total_amount: ["合计"],
        },
        table_schema: [
          { source: "品名", target: "item_name" },
          { source: "数量", target: "quantity" },
        ],
        excel_mapping_id: "fabric_excel_alt_v1",
        confidence_threshold: 0.7,
      }),
    );

    const index = createTemplateIndex(templates);
    const result = matchBillTypes(index, {
      text: "旺泰销货清单",
      headers: ["品名", "数量"],
      layout_features: ["two-column-header"],
    });

    expect(result.action).toBe("MATCH");
    expect(result.ambiguity).toBe(true);
    expect(result.candidates[0]?.score).toBeGreaterThan(
      result.candidates[1]?.score ?? -1,
    );
    expect(result.candidates[1]?.score).toBeGreaterThan(0.8);
  });

  it("routes an unknown type into onboarding", () => {
    const index = createTemplateIndex(makeTemplates());
    const result = matchBillTypes(index, {
      text: "完全不相关的单据内容",
      headers: ["随机字段"],
    });

    expect(result.action).toBe("TYPE_ONBOARDING");
    expect(result.type_match).toBe(0);
    expect(result.candidates.every((candidate) => candidate.score === 0)).toBe(
      true,
    );
  });
});
