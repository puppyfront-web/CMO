export interface TemplateFeatures {
  keywords: string[];
  layout_patterns: string[];
  table_headers: string[];
}

export interface TableSchemaEntry {
  source: string;
  target: string;
}

export interface BillTypeTemplate {
  type_id: string;
  version: number;
  features: TemplateFeatures;
  field_mapping: Record<string, string[]>;
  table_schema: TableSchemaEntry[];
  excel_mapping_id: string;
  confidence_threshold: number;
  post_rules: string[];
}

export function createBillTypeTemplate(
  input: Omit<BillTypeTemplate, "version" | "post_rules"> & {
    version?: number;
    post_rules?: string[];
  },
): BillTypeTemplate {
  return {
    ...input,
    version: input.version ?? 1,
    post_rules: input.post_rules ?? [],
  };
}
