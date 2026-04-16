import { describe, expect, test } from "vitest";

import { extractDocumentUrl, extractSpreadsheetUrl } from "../src/feishu.js";

describe("extractSpreadsheetUrl", () => {
  test("finds spreadsheet URLs in nested shortcut responses", () => {
    const url = extractSpreadsheetUrl({
      spreadsheet: {
        spreadsheet_token: "sheet-token",
        url: "https://example.feishu.cn/sheets/shtcn123"
      }
    });

    expect(url).toBe("https://example.feishu.cn/sheets/shtcn123");
  });
});

describe("extractDocumentUrl", () => {
  test("finds document URLs in nested shortcut responses", () => {
    const url = extractDocumentUrl({
      data: {
        document: {
          url: "https://example.feishu.cn/docx/doxcn123"
        }
      }
    });

    expect(url).toBe("https://example.feishu.cn/docx/doxcn123");
  });
});
