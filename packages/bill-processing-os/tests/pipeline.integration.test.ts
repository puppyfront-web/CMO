import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";
import { buildBillTemplate } from "../src/template/bill-template-builder.js";
import { runBillTaskPipeline } from "../src/pipeline.js";

function makeKnownTemplateBundle() {
  return buildBillTemplate({
    type_id: "fabric_sales_v1",
    normalized: {
      fields: {
        bill_date: "2026-04-01",
        vendor_name: "旺泰",
        total_amount: 1280,
      },
      items: [
        { item_name: "布料A", quantity: 2, unit_price: 100, amount: 200 },
        { item_name: "布料B", quantity: 3, unit_price: 360, amount: 1080 },
      ],
    },
    observed_layout: {
      keywords: ["销货清单", "旺泰"],
      layout_patterns: ["table_layout"],
      table_headers: ["品名", "数量", "单价", "金额"],
    },
    excel_mapping: {
      template_id: "fabric_excel_v1",
      sheet: "Sheet1",
      mapping: {
        A: "bill_date",
        B: "vendor_name",
        C: "items[].item_name",
        D: "items[].quantity",
        E: "items[].unit_price",
        F: "items[].amount",
      },
      mode: "expand_items",
      start_row: 2,
    },
  });
}

function makeKnownSource() {
  return {
    doc_id: "doc-known",
    file_url: "file:///tmp/doc-known.json",
    source_filename: "doc-known.json",
    mime_type: "application/json",
    markdown: [
      "销货清单",
      "供应商: 旺泰",
      "日期: 2026-04-01",
      "合计: 1280",
      "| 品名 | 数量 | 单价 | 金额 |",
      "| --- | --- | --- | --- |",
      "| 布料A | 2 | 100 | 200 |",
      "| 布料B | 3 | 360 | 1080 |",
    ].join("\n"),
    ocr_text: "",
    image_meta: { page_count: 1 },
  };
}

function makeUnknownSource() {
  return {
    doc_id: "doc-unknown",
    file_url: "file:///tmp/doc-unknown.json",
    source_filename: "doc-unknown.json",
    mime_type: "application/json",
    markdown: [
      "新品类采购单",
      "供应商: 新供应商",
      "日期: 2026-04-03",
      "总金额: 560",
      "| 规格 | 件数 | 单值 | 总值 |",
      "| --- | --- | --- | --- |",
      "| 新物料 | 4 | 140 | 560 |",
    ].join("\n"),
    image_meta: { page_count: 1 },
  };
}

describe("bill task pipeline", () => {
  it("auto-writes a known bill into workbook state and persists replay artifacts", async () => {
    const homeDir = await mkdtemp(path.join(os.tmpdir(), "bill-processing-pipeline-"));
    const templateBundle = makeKnownTemplateBundle();

    const result = await runBillTaskPipeline({
      sources: [makeKnownSource()],
      user_intent: "process this bill",
      home_dir: homeDir,
      templates: [templateBundle.template],
      excel_mappings: [templateBundle.excel_mapping],
      context: {
        target_excel: {
          workbook_path: "/tmp/bills.xlsx",
          sheet: "Sheet1",
          start_row: 2,
        },
      },
    });

    expect(result.summary.written).toBe(1);
    expect(result.summary.review_required).toBe(0);
    expect(result.summary.type_onboarding).toBe(0);
    expect(result.documents[0]?.decision).toBe("AUTO_WRITE");
    expect(result.documents[0]?.document.status).toBe("WRITTEN");
    expect(result.workbook.sheets.Sheet1.rows[2]?.C).toBe("布料A");
    expect(result.workbook.sheets.Sheet1.rows[3]?.F).toBe(1080);

    const taskJson = JSON.parse(await readFile(result.run.task_path, "utf8")) as {
      task_id: string;
    };
    const normalized = JSON.parse(
      await readFile(path.join(result.run.run_dir, "documents", "doc-known", "normalized.json"), "utf8"),
    ) as { fields: { total_amount: number } };
    const reflection = JSON.parse(
      await readFile(
        path.join(result.run.run_dir, "documents", "doc-known", "artifacts", "reflection.json"),
        "utf8",
      ),
    ) as { issues: Array<{ code: string }>; force_review: boolean };

    expect(taskJson.task_id).toBe(result.task.task_id);
    expect(normalized.fields.total_amount).toBe(1280);
    expect(reflection.force_review).toBe(false);
    expect(reflection.issues).toEqual([]);
  });

  it("keeps batch processing isolated while onboarding a new type and exposing cli json output", async () => {
    const workDir = await mkdtemp(path.join(os.tmpdir(), "bill-processing-cli-"));
    const inputDir = path.join(workDir, "inputs");
    const homeDir = path.join(workDir, "home");
    const templateBundle = makeKnownTemplateBundle();

    await mkdir(inputDir, { recursive: true });

    const pipelineResult = await runBillTaskPipeline({
      sources: [makeKnownSource(), makeUnknownSource()],
      user_intent: "batch process these bills",
      home_dir: homeDir,
      templates: [templateBundle.template],
      excel_mappings: [templateBundle.excel_mapping],
      onboarding_requests: {
        "doc-unknown": {
          type_id: "new_purchase_order_v1",
          observed_layout: {
            keywords: ["新品类采购单", "新供应商"],
            layout_patterns: ["table_layout"],
            table_headers: ["规格", "件数", "单值", "总值"],
          },
          excel_mapping: {
            template_id: "new_purchase_excel_v1",
            sheet: "Sheet2",
            mapping: {
              A: "bill_date",
              B: "vendor_name",
              C: "items[].item_name",
            },
            mode: "expand_items",
            start_row: 2,
          },
        },
      },
    });

    expect(pipelineResult.summary.total).toBe(2);
    expect(pipelineResult.summary.written).toBe(1);
    expect(pipelineResult.summary.type_onboarding).toBe(1);
    expect(
      pipelineResult.repository.getLatestTemplate("new_purchase_order_v1")?.version,
    ).toBe(1);

    await writeFile(path.join(inputDir, "known.json"), JSON.stringify(makeKnownSource(), null, 2), "utf8");
    await writeFile(path.join(inputDir, "unknown.json"), JSON.stringify(makeUnknownSource(), null, 2), "utf8");

    const stdout: string[] = [];
    const exitCode = await runCli(
      [
        "run",
        "--input",
        inputDir,
        "--home-dir",
        homeDir,
        "--json",
      ],
      {
        writeStdout: (chunk) => stdout.push(chunk),
        writeStderr: () => {},
      },
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout.join("").trim()) as {
      summary: { total: number };
    };
    expect(payload.summary.total).toBe(2);
  });

  it("uses reflection to stop auto-write when extracted totals are internally inconsistent", async () => {
    const homeDir = await mkdtemp(path.join(os.tmpdir(), "bill-processing-reflection-"));
    const templateBundle = makeKnownTemplateBundle();
    const riskySource = {
      ...makeKnownSource(),
      doc_id: "doc-risky",
      file_url: "file:///tmp/doc-risky.json",
      source_filename: "doc-risky.json",
      markdown: [
        "销货清单",
        "供应商: 旺泰",
        "日期: 2026-04-01",
        "合计: 500",
        "| 品名 | 数量 | 单价 | 金额 |",
        "| --- | --- | --- | --- |",
        "| 布料A | 2 | 100 | 200 |",
        "| 布料B | 3 | 360 | 1080 |",
      ].join("\n"),
    };

    const result = await runBillTaskPipeline({
      sources: [riskySource],
      user_intent: "process this bill",
      home_dir: homeDir,
      templates: [templateBundle.template],
      excel_mappings: [templateBundle.excel_mapping],
    });

    const reflection = JSON.parse(
      await readFile(
        path.join(result.run.run_dir, "documents", "doc-risky", "artifacts", "reflection.json"),
        "utf8",
      ),
    ) as { issues: Array<{ code: string }>; force_review: boolean };

    expect(result.summary.written).toBe(0);
    expect(result.summary.review_required).toBe(1);
    expect(result.documents[0]?.decision).toBe("REVIEW_REQUIRED");
    expect(reflection.force_review).toBe(true);
    expect(reflection.issues).toEqual([
      expect.objectContaining({ code: "total_amount_mismatch" }),
    ]);
  });
});
