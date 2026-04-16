import { readFile } from "node:fs/promises";

import type { BillTypeTemplate } from "../domain/bill-template.js";
import type { ExcelTemplateMapping } from "../domain/excel-mapping.js";

export interface TemplateBundle {
  template: BillTypeTemplate;
  excel_mapping: ExcelTemplateMapping;
}

export async function loadTemplateBundle(filePath: string): Promise<TemplateBundle> {
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents) as TemplateBundle;
}
