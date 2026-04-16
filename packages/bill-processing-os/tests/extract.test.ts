import { describe, expect, it } from "vitest";

import { createBillDocument } from "../src/domain/bill-document.js";
import { createBillTypeTemplate } from "../src/domain/bill-template.js";
import { runBillExtractionPipeline } from "../src/extract/bill-extraction-pipeline.js";

describe("bill extraction pipeline", () => {
  it("extracts and normalizes a clean printed bill from markdown and OCR", () => {
    const document = createBillDocument({
      doc_id: "doc-001",
      file_url: "file:///tmp/doc-001.png",
      source_filename: "doc-001.png",
    });

    document.raw = {
      markdown: [
        "发票",
        "开票日期：2026年4月15日",
        "卖方：旺泰食品",
        "总金额：￥123.40",
        "",
        "| 品名 | 数量 | 单价 | 金额 |",
        "| 牛奶 | 2 | 12.50 | 25.00 |",
        "| 面包 | 4 | 24.60 | 98.40 |",
      ].join("\n"),
      ocr_text: [
        "日期 2026/04/15",
        "供应商 旺泰食品",
        "总金额 123.40",
        "牛奶 2 12.50 25.00",
        "面包 4 24.60 98.40",
      ].join("\n"),
      image_meta: { page_count: 1 },
    };

    const template = createBillTypeTemplate({
      type_id: "sale_invoice",
      features: {
        keywords: ["发票", "旺泰食品"],
        layout_patterns: ["header_then_table"],
        table_headers: ["品名", "数量", "单价", "金额"],
      },
      field_mapping: {
        bill_date: ["开票日期", "日期"],
        vendor_name: ["卖方", "供应商"],
        total_amount: ["总金额", "合计"],
      },
      table_schema: [
        { source: "品名", target: "item_name" },
        { source: "数量", target: "quantity" },
        { source: "单价", target: "unit_price" },
        { source: "金额", target: "amount" },
      ],
      excel_mapping_id: "sale_invoice_excel",
      confidence_threshold: 0.9,
    });

    const result = runBillExtractionPipeline({
      document,
      template,
    });

    expect(result.document.parsed.fields).toEqual({
      bill_date: "2026-04-15",
      vendor_name: "旺泰食品",
      total_amount: "￥123.40",
      currency: "CNY",
    });
    expect(result.document.parsed.items).toEqual([
      {
        item_name: "牛奶",
        quantity: "2",
        unit_price: "12.50",
        amount: "25.00",
      },
      {
        item_name: "面包",
        quantity: "4",
        unit_price: "24.60",
        amount: "98.40",
      },
    ]);
    expect(result.document.normalized.fields).toEqual({
      bill_date: "2026-04-15",
      vendor_name: "旺泰食品",
      total_amount: 123.4,
      currency: "CNY",
    });
    expect(result.document.normalized.items).toEqual([
      {
        item_name: "牛奶",
        quantity: 2,
        unit_price: 12.5,
        amount: 25,
      },
      {
        item_name: "面包",
        quantity: 4,
        unit_price: 24.6,
        amount: 98.4,
      },
    ]);
    expect(result.field_confidences).toMatchObject({
      bill_date: 1,
      vendor_name: 1,
      total_amount: 1,
    });
  });

  it("leaves a missing total amount empty instead of inventing one from unrelated digits", () => {
    const document = createBillDocument({
      doc_id: "doc-002",
      file_url: "file:///tmp/doc-002.png",
      source_filename: "doc-002.png",
    });

    document.raw = {
      markdown: [
        "发票",
        "开票日期：2026年4月15日",
        "卖方：旺泰食品",
        "",
        "| 品名 | 数量 | 单价 | 金额 |",
        "| 牛奶 | 2 | 12.50 | 25.00 |",
        "| 面包 | 4 | 24.60 | 98.40 |",
      ].join("\n"),
      ocr_text: [
        "日期 2026/04/15",
        "供应商 旺泰食品",
        "牛奶 2 12.50 25.00",
        "面包 4 24.60 98.40",
      ].join("\n"),
      image_meta: { page_count: 1 },
    };

    const template = createBillTypeTemplate({
      type_id: "sale_invoice",
      features: {
        keywords: ["发票", "旺泰食品"],
        layout_patterns: ["header_then_table"],
        table_headers: ["品名", "数量", "单价", "金额"],
      },
      field_mapping: {
        bill_date: ["开票日期", "日期"],
        vendor_name: ["卖方", "供应商"],
        total_amount: ["总金额", "合计"],
      },
      table_schema: [
        { source: "品名", target: "item_name" },
        { source: "数量", target: "quantity" },
        { source: "单价", target: "unit_price" },
        { source: "金额", target: "amount" },
      ],
      excel_mapping_id: "sale_invoice_excel",
      confidence_threshold: 0.9,
    });

    const result = runBillExtractionPipeline({
      document,
      template,
    });

    expect(result.document.parsed.fields).toEqual({
      bill_date: "2026-04-15",
      vendor_name: "旺泰食品",
      currency: "CNY",
    });
    expect(result.document.normalized.fields).toEqual({
      bill_date: "2026-04-15",
      vendor_name: "旺泰食品",
      currency: "CNY",
    });
    expect(result.field_confidences.total_amount).toBeUndefined();
  });

  it("prefers handwritten overrides even when the annotation uses a label alias", () => {
    const document = createBillDocument({
      doc_id: "doc-003",
      file_url: "file:///tmp/doc-003.png",
      source_filename: "doc-003.png",
    });

    document.raw = {
      markdown: [
        "发票",
        "开票日期：2026年4月15日",
        "卖方：旺泰食品",
        "总金额：￥123.40",
        "",
        "| 品名 | 数量 | 单价 | 金额 |",
        "| 牛奶 | 2 | 12.50 | 25.00 |",
      ].join("\n"),
      ocr_text: [
        "日期 2026/04/15",
        "供应商 旺泰食品",
        "总金额 123.40",
        "牛奶 2 12.50 25.00",
      ].join("\n"),
      image_meta: { page_count: 1 },
    };

    document.handwriting = {
      has_handwriting: true,
      annotations: [
        {
          field: "总金额",
          value: "￥130.00",
          confidence: 0.67,
          evidence: "handwritten override near total",
        },
      ],
    };

    const template = createBillTypeTemplate({
      type_id: "sale_invoice",
      features: {
        keywords: ["发票", "旺泰食品"],
        layout_patterns: ["header_then_table"],
        table_headers: ["品名", "数量", "单价", "金额"],
      },
      field_mapping: {
        bill_date: ["开票日期", "日期"],
        vendor_name: ["卖方", "供应商"],
        total_amount: ["总金额", "合计"],
      },
      table_schema: [
        { source: "品名", target: "item_name" },
        { source: "数量", target: "quantity" },
        { source: "单价", target: "unit_price" },
        { source: "金额", target: "amount" },
      ],
      excel_mapping_id: "sale_invoice_excel",
      confidence_threshold: 0.9,
    });

    const result = runBillExtractionPipeline({
      document,
      template,
    });

    expect(result.document.parsed.fields).toEqual({
      bill_date: "2026-04-15",
      vendor_name: "旺泰食品",
      total_amount: "￥130.00",
      currency: "CNY",
    });
    expect(result.document.normalized.fields).toEqual({
      bill_date: "2026-04-15",
      vendor_name: "旺泰食品",
      total_amount: 130,
      currency: "CNY",
    });
    expect(result.field_confidences.total_amount).toBe(0.67);
  });
});
