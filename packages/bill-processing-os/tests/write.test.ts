import { describe, expect, it } from "vitest";

import { createBillDocument } from "../src/domain/bill-document.js";
import { createExcelTemplateMapping } from "../src/domain/excel-mapping.js";
import { createWorkbookState, writeBillDocument } from "../src/write/bill-excel-writer.js";

describe("bill-excel-writer", () => {
  it("writes normalized fields into fixed cells", () => {
    const document = createBillDocument({
      doc_id: "doc-101",
      file_url: "file:///tmp/doc-101.png",
      source_filename: "doc-101.png",
    });
    document.normalized.fields = {
      bill_date: "2026-04-16",
      vendor_name: "Acme Trading",
      total_amount: 88.5,
    };

    const mapping = createExcelTemplateMapping({
      template_id: "sales_excel_v1",
      sheet: "Sheet1",
      mapping: {
        A1: "bill_date",
        B1: "vendor_name",
        C1: "total_amount",
      },
      mode: "fixed_cells",
      start_row: 2,
    });

    const result = writeBillDocument(document, mapping, createWorkbookState());

    expect(result.status).toBe("written");
    expect(result.sheet).toBe("Sheet1");
    expect(result.start_row).toBe(2);
    expect(result.workbook.sheets.Sheet1.cells.A1).toBe("2026-04-16");
    expect(result.workbook.sheets.Sheet1.cells.B1).toBe("Acme Trading");
    expect(result.workbook.sheets.Sheet1.cells.C1).toBe(88.5);
  });

  it("expands line items into sequential rows", () => {
    const document = createBillDocument({
      doc_id: "doc-102",
      file_url: "file:///tmp/doc-102.png",
      source_filename: "doc-102.png",
    });
    document.normalized.items = [
      { item_name: "Notebook", quantity: 2, amount: 20 },
      { item_name: "Pen", quantity: 3, amount: 15 },
    ];

    const mapping = createExcelTemplateMapping({
      template_id: "sales_excel_v1",
      sheet: "Sheet1",
      mapping: {
        A: "items[].item_name",
        B: "items[].quantity",
        C: "items[].amount",
      },
      mode: "expand_items",
      start_row: 5,
    });

    const result = writeBillDocument(document, mapping, createWorkbookState());

    expect(result.status).toBe("written");
    expect(result.start_row).toBe(5);
    expect(result.workbook.sheets.Sheet1.rows[5]).toEqual({
      A: "Notebook",
      B: 2,
      C: 20,
    });
    expect(result.workbook.sheets.Sheet1.rows[6]).toEqual({
      A: "Pen",
      B: 3,
      C: 15,
    });
  });

  it("overwrites the requested repair row", () => {
    const document = createBillDocument({
      doc_id: "doc-103",
      file_url: "file:///tmp/doc-103.png",
      source_filename: "doc-103.png",
    });
    document.normalized.items = [{ item_name: "Desk", quantity: 1, amount: 120 }];

    const mapping = createExcelTemplateMapping({
      template_id: "sales_excel_v1",
      sheet: "Sheet1",
      mapping: {
        A: "items[].item_name",
        B: "items[].quantity",
        C: "items[].amount",
      },
      mode: "expand_items",
      start_row: 5,
    });

    const workbook = createWorkbookState({
      sheets: {
        Sheet1: {
          cells: {
            A5: "Old Desk",
            B5: 99,
            C5: 1,
          },
          rows: {
            5: {
              A: "Old Desk",
              B: 99,
              C: 1,
            },
          },
        },
      },
    });

    const result = writeBillDocument(document, mapping, workbook, {
      mode: "repair",
      repair_row: 5,
    });

    expect(result.status).toBe("overwritten");
    expect(result.start_row).toBe(5);
    expect(result.workbook.sheets.Sheet1.rows[5]).toEqual({
      A: "Desk",
      B: 1,
      C: 120,
    });
    expect(result.workbook.sheets.Sheet1.cells.A5).toBe("Desk");
    expect(result.workbook.sheets.Sheet1.cells.B5).toBe(1);
    expect(result.workbook.sheets.Sheet1.cells.C5).toBe(120);
  });
});
