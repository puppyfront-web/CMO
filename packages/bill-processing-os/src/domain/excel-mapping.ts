export type ExcelWriteMode = "expand_items" | "fixed_cells";

export interface ExcelTemplateMapping {
  template_id: string;
  sheet: string;
  mapping: Record<string, string>;
  mode: ExcelWriteMode;
  start_row: number;
}

export function createExcelTemplateMapping(
  input: Omit<ExcelTemplateMapping, "start_row"> & {
    start_row?: number;
  },
): ExcelTemplateMapping {
  return {
    ...input,
    start_row: input.start_row ?? 2,
  };
}
