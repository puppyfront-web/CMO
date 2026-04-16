import { chmod, mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { runCli } from "../src/cli.js";

function makeTemplateBundle() {
  return {
    template: {
      type_id: "fabric_sales_v1",
      version: 1,
      features: {
        keywords: ["销货清单", "旺泰"],
        layout_patterns: ["table_layout"],
        table_headers: ["品名", "数量", "单价", "金额"],
      },
      field_mapping: {
        bill_date: ["日期"],
        vendor_name: ["供应商"],
        total_amount: ["合计", "总金额"],
      },
      table_schema: [
        { source: "品名", target: "item_name" },
        { source: "数量", target: "quantity" },
        { source: "单价", target: "unit_price" },
        { source: "金额", target: "amount" },
      ],
      excel_mapping_id: "fabric_excel_v1",
      confidence_threshold: 0.8,
      post_rules: [],
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
  };
}

describe("delivery cli", () => {
  it("processes a markdown bill with a template bundle and writes a real xlsx file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "bill-cli-delivery-"));
    const inputDir = path.join(tempDir, "inputs");
    const bundlePath = path.join(tempDir, "fabric.bundle.json");
    const billPath = path.join(inputDir, "fabric-bill.md");
    const excelOut = path.join(tempDir, "result.xlsx");
    const homeDir = path.join(tempDir, "home");

    await mkdir(inputDir, { recursive: true });
    await writeFile(bundlePath, JSON.stringify(makeTemplateBundle(), null, 2), "utf8");
    await writeFile(
      billPath,
      [
        "销货清单",
        "供应商: 旺泰",
        "日期: 2026-04-01",
        "合计: 1280",
        "| 品名 | 数量 | 单价 | 金额 |",
        "| --- | --- | --- | --- |",
        "| 布料A | 2 | 100 | 200 |",
        "| 布料B | 3 | 360 | 1080 |",
      ].join("\n"),
      "utf8",
    );

    const stdout: string[] = [];
    const exitCode = await runCli(
      [
        "run",
        "--input",
        billPath,
        "--template-bundle",
        bundlePath,
        "--excel-out",
        excelOut,
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
      summary: { written: number };
    };
    expect(payload.summary.written).toBe(1);

    const workbook = XLSX.read(await readFile(excelOut), { type: "buffer" });
    const sheet = workbook.Sheets.Sheet1;

    expect(sheet.A2?.v).toBe("2026-04-01");
    expect(sheet.B2?.v).toBe("旺泰");
    expect(sheet.C2?.v).toBe("布料A");
    expect(sheet.F3?.v).toBe(1080);

    const [runDir] = await readdir(path.join(homeDir, ".bill-processing-os", "runs"));
    const taskDirectories = await readFile(
      path.join(homeDir, ".bill-processing-os", "runs", runDir, "task.json"),
      "utf8",
    );
    expect(taskDirectories).toContain("fabric-bill");
  });

  it("processes the yubo fabric ticket sample into a real xlsx file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "bill-cli-yubo-"));
    const bundlePath = path.join(
      tempDir,
      "yubo-template.bundle.json",
    );
    const billPath = path.join(tempDir, "yubo-ticket.md");
    const excelOut = path.join(tempDir, "yubo-result.xlsx");
    const homeDir = path.join(tempDir, "home");

    const bundle = {
      template: {
        type_id: "yubo_fabric_ticket_v1",
        version: 1,
        features: {
          keywords: ["宇博布行", "商品名称", "颜色"],
          layout_patterns: ["table_layout", "fabric_ticket"],
          table_headers: ["商品名称", "颜色", "数量", "单位", "单价", "金额"],
        },
        field_mapping: {
          bill_date: ["日期"],
          vendor_name: ["供应商", "档口", "布行"],
          total_amount: ["本单金额", "金额", "合计"],
          settlement_method: ["结算方式"],
          summary: ["摘要"],
        },
        table_schema: [
          { source: "商品名称", target: "item_name" },
          { source: "颜色", target: "color" },
          { source: "数量", target: "quantity" },
          { source: "单位", target: "unit" },
          { source: "单价", target: "unit_price" },
          { source: "金额", target: "amount" },
        ],
        excel_mapping_id: "yubo_fabric_excel_v1",
        confidence_threshold: 0.8,
        post_rules: [],
      },
      excel_mapping: {
        template_id: "yubo_fabric_excel_v1",
        sheet: "Sheet1",
        mapping: {
          A: "bill_date",
          B: "vendor_name",
          C: "summary",
          D: "items[].item_name",
          E: "items[].color",
          F: "items[].quantity",
          G: "items[].unit",
          H: "items[].unit_price",
          I: "items[].amount",
        },
        mode: "expand_items",
        start_row: 2,
      },
    };

    await writeFile(bundlePath, JSON.stringify(bundle, null, 2), "utf8");
    await writeFile(
      billPath,
      [
        "宇博布行",
        "供应商: 宇博布行",
        "日期: 2026-04-10",
        "结算方式: 欠款",
        "摘要: 26082款",
        "本单金额: 591.60",
        "| 商品名称 | 颜色 | 数量 | 单位 | 单价 | 金额 |",
        "| --- | --- | --- | --- | --- | --- |",
        "| 55599A | 17#黑白配红+4 | 10.2 | 公斤 | 58 | 591.60 |",
      ].join("\n"),
      "utf8",
    );

    const exitCode = await runCli(
      [
        "run",
        "--input",
        billPath,
        "--template-bundle",
        bundlePath,
        "--excel-out",
        excelOut,
        "--home-dir",
        homeDir,
      ],
      {
        writeStdout: () => {},
        writeStderr: () => {},
      },
    );

    expect(exitCode).toBe(0);

    const workbook = XLSX.read(await readFile(excelOut), { type: "buffer" });
    const sheet = workbook.Sheets.Sheet1;

    expect(sheet.A2?.v).toBe("2026-04-10");
    expect(sheet.B2?.v).toBe("宇博布行");
    expect(sheet.C2?.v).toBe("26082款");
    expect(sheet.D2?.v).toBe("55599A");
    expect(sheet.F2?.v).toBe(10.2);
    expect(sheet.H2?.v).toBe(58);
    expect(sheet.I2?.v).toBe(591.6);
  });

  it("processes an image bill by invoking an OCR command and writes a real xlsx file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "bill-cli-image-"));
    const bundlePath = path.join(tempDir, "yubo-image-template.bundle.json");
    const imagePath = path.join(tempDir, "yubo-ticket.jpg");
    const ocrScriptPath = path.join(tempDir, "ocr-provider.sh");
    const excelOut = path.join(tempDir, "yubo-image-result.xlsx");
    const homeDir = path.join(tempDir, "home");

    const bundle = {
      template: {
        type_id: "yubo_fabric_ticket_v1",
        version: 1,
        features: {
          keywords: ["宇博布行", "商品名称", "颜色"],
          layout_patterns: ["table_layout", "fabric_ticket"],
          table_headers: ["商品名称", "颜色", "数量", "单位", "单价", "金额"],
        },
        field_mapping: {
          bill_date: ["日期"],
          vendor_name: ["供应商", "档口", "布行"],
          total_amount: ["本单金额", "金额", "合计"],
          settlement_method: ["结算方式"],
          summary: ["摘要"],
        },
        table_schema: [
          { source: "商品名称", target: "item_name" },
          { source: "颜色", target: "color" },
          { source: "数量", target: "quantity" },
          { source: "单位", target: "unit" },
          { source: "单价", target: "unit_price" },
          { source: "金额", target: "amount" },
        ],
        excel_mapping_id: "yubo_fabric_excel_v1",
        confidence_threshold: 0.8,
        post_rules: [],
      },
      excel_mapping: {
        template_id: "yubo_fabric_excel_v1",
        sheet: "Sheet1",
        mapping: {
          A: "bill_date",
          B: "vendor_name",
          C: "summary",
          D: "items[].item_name",
          E: "items[].color",
          F: "items[].quantity",
          G: "items[].unit",
          H: "items[].unit_price",
          I: "items[].amount",
        },
        mode: "expand_items",
        start_row: 2,
      },
    };

    await writeFile(bundlePath, JSON.stringify(bundle, null, 2), "utf8");
    await writeFile(imagePath, "fake-image-binary", "utf8");
    await writeFile(
      ocrScriptPath,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "printf '%s\\n' '宇博布行'",
        "printf '%s\\n' '供应商: 宇博布行'",
        "printf '%s\\n' '日期: 2026-04-10'",
        "printf '%s\\n' '结算方式: 欠款'",
        "printf '%s\\n' '摘要: 26082款'",
        "printf '%s\\n' '本单金额: 591.60'",
        "printf '%s\\n' '| 商品名称 | 颜色 | 数量 | 单位 | 单价 | 金额 |'",
        "printf '%s\\n' '| --- | --- | --- | --- | --- | --- |'",
        "printf '%s\\n' '| 55599A | 17#黑白配红+4 | 10.2 | 公斤 | 58 | 591.60 |'",
      ].join("\n"),
      "utf8",
    );
    await chmod(ocrScriptPath, 0o755);

    const exitCode = await runCli(
      [
        "run",
        "--input",
        imagePath,
        "--template-bundle",
        bundlePath,
        "--ocr-command",
        ocrScriptPath,
        "--excel-out",
        excelOut,
        "--home-dir",
        homeDir,
      ],
      {
        writeStdout: () => {},
        writeStderr: () => {},
      },
    );

    expect(exitCode).toBe(0);

    const workbook = XLSX.read(await readFile(excelOut), { type: "buffer" });
    const sheet = workbook.Sheets.Sheet1;

    expect(sheet.A2?.v).toBe("2026-04-10");
    expect(sheet.B2?.v).toBe("宇博布行");
    expect(sheet.C2?.v).toBe("26082款");
    expect(sheet.D2?.v).toBe("55599A");
    expect(sheet.F2?.v).toBe(10.2);
    expect(sheet.H2?.v).toBe(58);
    expect(sheet.I2?.v).toBe(591.6);
  });
});
