import { describe, expect, test } from "vitest";

import { normalizeAnalysisRecord, renderDetailDocumentMarkdown } from "../src/extraction.js";

describe("normalizeAnalysisRecord", () => {
  test("accepts JSON-like payloads and fills stable defaults", () => {
    const normalized = normalizeAnalysisRecord(
      {
        customerName: "王女士",
        phone: "13912345678",
        customerCategory: "老客户",
        needs: ["视频号运营", "私域转化"],
        engagementStage: "需求确认",
        summary: "客户主要关心交付周期。",
        nextActions: ["发送案例", "补充报价"],
        risks: "预算有限",
        mindmap: {
          title: "通话脑图",
          children: ["客户背景", { title: "核心需求", children: ["视频号运营"] }]
        }
      },
      "2026-04-13"
    );

    expect(normalized.date).toBe("2026-04-13");
    expect(normalized.customerName).toBe("王女士");
    expect(normalized.needs).toBe("视频号运营；私域转化");
    expect(normalized.nextActions).toEqual(["发送案例", "补充报价"]);
    expect(normalized.risks).toEqual(["预算有限"]);
    expect(normalized.mindmap[0]?.title).toBe("通话脑图");
  });

  test("handles raw JSON strings and blank optional values", () => {
    const normalized = normalizeAnalysisRecord(
      "{\"customerName\":\"未留名\",\"needs\":\"了解代运营\",\"mindmap\":[\"客户信息\",\"下一步\"]}",
      "2026-04-13"
    );

    expect(normalized.customerName).toBe("未留名");
    expect(normalized.phone).toBe("");
    expect(normalized.engagementStage).toBe("待确认");
    expect(normalized.mindmap).toHaveLength(2);
  });
});

describe("renderDetailDocumentMarkdown", () => {
  test("renders a readable Feishu markdown document with a mind-map outline", () => {
    const markdown = renderDetailDocumentMarkdown({
      date: "2026-04-13",
      customerName: "王女士",
      phone: "13912345678",
      customerCategory: "老客户",
      needs: "视频号运营；私域转化",
      engagementStage: "需求确认",
      summary: "客户主要关心交付周期。",
      nextActions: ["发送案例", "补充报价"],
      risks: ["预算有限"],
      mindmap: [
        {
          title: "客户信息",
          children: [{ title: "老客户" }]
        },
        {
          title: "核心需求",
          children: [{ title: "视频号运营" }]
        }
      ]
    });

    expect(markdown).toContain("# 打电话录音分析");
    expect(markdown).toContain("## 核心字段");
    expect(markdown).toContain("## 脑图");
    expect(markdown).toContain("- 客户信息");
    expect(markdown).toContain("  - 老客户");
    expect(markdown).toContain("## 后续跟进");
  });
});
