import type { BillDocument } from "../domain/bill-document.js";
import type { ExcelTemplateMapping } from "../domain/excel-mapping.js";

export interface WrittenCell {
  row: number;
  column: string;
  cell: string;
  value: unknown;
}

function resolveMappedValue(
  document: BillDocument,
  targetPath: string,
  item?: Record<string, unknown>,
): unknown {
  if (targetPath.startsWith("items[].")) {
    const key = targetPath.slice("items[].".length);
    return item?.[key];
  }

  if (targetPath.startsWith("fields.")) {
    return document.normalized.fields[targetPath.slice("fields.".length)];
  }

  if (targetPath in document.normalized.fields) {
    return document.normalized.fields[targetPath];
  }

  if (targetPath in document.parsed.fields) {
    return document.parsed.fields[targetPath];
  }

  return undefined;
}

export function buildWrittenCells(
  document: BillDocument,
  mapping: ExcelTemplateMapping,
  startRow: number,
): WrittenCell[] {
  if (mapping.mode === "fixed_cells") {
    return Object.entries(mapping.mapping).map(([cell, targetPath]) => ({
      row: startRow,
      column: cell.replace(/\d+$/u, ""),
      cell,
      value: resolveMappedValue(document, targetPath),
    }));
  }

  const rows: WrittenCell[] = [];

  document.normalized.items.forEach((item, index) => {
    const row = startRow + index;
    for (const [column, targetPath] of Object.entries(mapping.mapping)) {
      rows.push({
        row,
        column,
        cell: `${column}${row}`,
        value: resolveMappedValue(document, targetPath, item),
      });
    }
  });

  return rows;
}
