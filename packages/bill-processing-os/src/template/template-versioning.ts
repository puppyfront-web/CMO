import type { BillTypeTemplate, TableSchemaEntry, TemplateFeatures } from "../domain/bill-template.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function mergeTerms(left: string[], right?: string[]): string[] {
  if (!right) {
    return clone(left);
  }

  return [...new Set([...left, ...right].map((value) => value.trim()).filter(Boolean))];
}

export function versionBillTemplate(
  template: BillTypeTemplate,
  patch: {
    features?: Partial<TemplateFeatures>;
    field_mapping?: Record<string, string[]>;
    table_schema?: TableSchemaEntry[];
    excel_mapping_id?: string;
    confidence_threshold?: number;
    post_rules?: string[];
  },
): BillTypeTemplate {
  return {
    type_id: template.type_id,
    version: template.version + 1,
    features: {
      keywords: mergeTerms(template.features.keywords, patch.features?.keywords),
      layout_patterns: mergeTerms(
        template.features.layout_patterns,
        patch.features?.layout_patterns,
      ),
      table_headers: mergeTerms(
        template.features.table_headers,
        patch.features?.table_headers,
      ),
    },
    field_mapping: clone(patch.field_mapping ?? template.field_mapping),
    table_schema: clone(patch.table_schema ?? template.table_schema),
    excel_mapping_id: patch.excel_mapping_id ?? template.excel_mapping_id,
    confidence_threshold:
      patch.confidence_threshold ?? template.confidence_threshold,
    post_rules: clone(patch.post_rules ?? template.post_rules),
  };
}

