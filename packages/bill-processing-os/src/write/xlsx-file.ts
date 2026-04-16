import { mkdir } from "node:fs/promises";
import path from "node:path";

import * as XLSX from "xlsx";

import type { WorkbookState } from "./bill-excel-writer.js";

function inferCellType(value: unknown): XLSX.CellObject["t"] {
  if (typeof value === "number") {
    return "n";
  }

  if (typeof value === "boolean") {
    return "b";
  }

  return "s";
}

function buildSheet(sheetState: WorkbookState["sheets"][string]): XLSX.WorkSheet {
  const worksheet: XLSX.WorkSheet = {};
  let range: XLSX.Range | null = null;

  for (const [address, value] of Object.entries(sheetState.cells)) {
    const cell = XLSX.utils.decode_cell(address);
    worksheet[address] = {
      v: value,
      t: inferCellType(value),
    };

    if (range === null) {
      range = {
        s: { c: cell.c, r: cell.r },
        e: { c: cell.c, r: cell.r },
      };
    } else {
      range.s.c = Math.min(range.s.c, cell.c);
      range.s.r = Math.min(range.s.r, cell.r);
      range.e.c = Math.max(range.e.c, cell.c);
      range.e.r = Math.max(range.e.r, cell.r);
    }
  }

  worksheet["!ref"] = range ? XLSX.utils.encode_range(range) : "A1";
  return worksheet;
}

export async function writeWorkbookStateToXlsx(
  workbookState: WorkbookState,
  outputPath: string,
): Promise<string> {
  const workbook = XLSX.utils.book_new();

  for (const [sheetName, sheetState] of Object.entries(workbookState.sheets)) {
    XLSX.utils.book_append_sheet(workbook, buildSheet(sheetState), sheetName);
  }

  if (Object.keys(workbookState.sheets).length === 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Sheet1");
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  XLSX.writeFile(workbook, outputPath);
  return outputPath;
}
