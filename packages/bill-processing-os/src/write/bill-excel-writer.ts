import type { BillDocument } from "../domain/bill-document.js";
import type { ExcelTemplateMapping } from "../domain/excel-mapping.js";
import { loadExcelTemplateMapping } from "./excel-template-loader.js";
import { buildWrittenCells, type WrittenCell } from "./row-expander.js";

export interface WorkbookSheetState {
  cells: Record<string, unknown>;
  rows: Record<number, Record<string, unknown>>;
}

export interface WorkbookState {
  sheets: Record<string, WorkbookSheetState>;
}

export type ExcelWriteStatus = "written" | "overwritten";

export interface WriteBillDocumentOptions {
  mode?: "append" | "repair";
  repair_row?: number;
}

export interface WriteBillDocumentResult {
  workbook: WorkbookState;
  sheet: string;
  start_row: number;
  written_cells: WrittenCell[];
  status: ExcelWriteStatus;
}

function cloneWorkbookState(workbook: WorkbookState): WorkbookState {
  return structuredClone(workbook);
}

function ensureSheet(workbook: WorkbookState, sheetName: string): WorkbookSheetState {
  if (!workbook.sheets[sheetName]) {
    workbook.sheets[sheetName] = {
      cells: {},
      rows: {},
    };
  }

  return workbook.sheets[sheetName];
}

function getNextAppendRow(sheet: WorkbookSheetState, startRow: number): number {
  const existingRows = Object.keys(sheet.rows).map(Number);
  if (existingRows.length === 0) {
    return startRow;
  }

  return Math.max(startRow, ...existingRows) + 1;
}

function getWriteStartRow(
  sheet: WorkbookSheetState,
  mapping: ExcelTemplateMapping,
  options: WriteBillDocumentOptions,
): number {
  if (options.mode === "repair" && options.repair_row !== undefined) {
    return options.repair_row;
  }

  if (mapping.mode === "fixed_cells") {
    return mapping.start_row;
  }

  return getNextAppendRow(sheet, mapping.start_row);
}

function writeCell(sheet: WorkbookSheetState, cell: WrittenCell): void {
  sheet.cells[cell.cell] = cell.value;
  if (!sheet.rows[cell.row]) {
    sheet.rows[cell.row] = {};
  }
  sheet.rows[cell.row][cell.column] = cell.value;
}

export function createWorkbookState(
  initial?: Partial<WorkbookState>,
): WorkbookState {
  return {
    sheets: structuredClone(initial?.sheets ?? {}),
  };
}

export function writeBillDocument(
  document: BillDocument,
  mapping: ExcelTemplateMapping,
  workbook: WorkbookState = createWorkbookState(),
  options: WriteBillDocumentOptions = {},
): WriteBillDocumentResult {
  const normalizedMapping = loadExcelTemplateMapping(mapping);
  const nextWorkbook = cloneWorkbookState(workbook);
  const sheet = ensureSheet(nextWorkbook, normalizedMapping.sheet);
  const start_row = getWriteStartRow(sheet, normalizedMapping, options);
  const written_cells = buildWrittenCells(document, normalizedMapping, start_row);

  for (const cell of written_cells) {
    writeCell(sheet, cell);
  }

  return {
    workbook: nextWorkbook,
    sheet: normalizedMapping.sheet,
    start_row,
    written_cells,
    status: options.mode === "repair" ? "overwritten" : "written",
  };
}
