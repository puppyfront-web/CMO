import type { BillDocumentParsed } from "../domain/bill-document.js";
import {
  createBillTypeTemplate,
  type BillTypeTemplate,
  type TableSchemaEntry,
  type TemplateFeatures,
} from "../domain/bill-template.js";
import {
  createExcelTemplateMapping,
  type ExcelTemplateMapping,
} from "../domain/excel-mapping.js";

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function deriveFieldMapping(fields: Record<string, unknown>): Record<string, string[]> {
  return Object.fromEntries(
    Object.keys(fields).map((field) => [field, [field]]),
  );
}

function deriveTableSchema(input: {
  tableHeaders: string[];
  normalized: BillDocumentParsed;
}): TableSchemaEntry[] {
  const [firstItem] = input.normalized.items;

  if (!firstItem) {
    return [];
  }

  const itemKeys = Object.keys(firstItem);
  return input.tableHeaders.slice(0, itemKeys.length).map((header, index) => ({
    source: header,
    target: itemKeys[index] ?? header,
  }));
}

export interface BillTemplateBuildInput {
  type_id: string;
  normalized: BillDocumentParsed;
  observed_layout: TemplateFeatures;
  excel_mapping: ExcelTemplateMapping;
  field_mapping?: Record<string, string[]>;
  confidence_threshold?: number;
  post_rules?: string[];
}

export interface BillTemplateBundle {
  template: BillTypeTemplate;
  excel_mapping: ExcelTemplateMapping;
}

export function buildBillTemplate(input: BillTemplateBuildInput): BillTemplateBundle {
  const template = createBillTypeTemplate({
    type_id: input.type_id,
    version: 1,
    features: {
      keywords: unique(input.observed_layout.keywords),
      layout_patterns: unique(input.observed_layout.layout_patterns),
      table_headers: unique(input.observed_layout.table_headers),
    },
    field_mapping: input.field_mapping ?? deriveFieldMapping(input.normalized.fields),
    table_schema: deriveTableSchema({
      tableHeaders: unique(input.observed_layout.table_headers),
      normalized: input.normalized,
    }),
    excel_mapping_id: input.excel_mapping.template_id,
    confidence_threshold: input.confidence_threshold ?? 0.6,
    post_rules: input.post_rules ?? [],
  });

  return {
    template,
    excel_mapping: createExcelTemplateMapping(input.excel_mapping),
  };
}

