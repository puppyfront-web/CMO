import type { BillTypeTemplate } from "../domain/bill-template.js";

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function sortedCopy(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}

export interface TemplateIndexEntry {
  template: BillTypeTemplate;
  keywordTerms: string[];
  headerTerms: string[];
  layoutTerms: string[];
  searchableTerms: string[];
}

export interface TemplateIndex {
  entries: TemplateIndexEntry[];
}

export function createTemplateIndex(templates: BillTypeTemplate[]): TemplateIndex {
  const entries = templates
    .map<TemplateIndexEntry>((template) => {
      const keywordTerms = dedupe(template.features.keywords);
      const headerTerms = dedupe(template.features.table_headers);
      const layoutTerms = dedupe(template.features.layout_patterns);

      return {
        template,
        keywordTerms,
        headerTerms,
        layoutTerms,
        searchableTerms: dedupe([...keywordTerms, ...headerTerms, ...layoutTerms]),
      };
    })
    .sort((left, right) => {
      const score = left.template.type_id.localeCompare(
        right.template.type_id,
        "zh-Hans-CN",
      );

      return score;
    });

  return {
    entries: sortedCopy(entries.map((entry) => entry.template.type_id)).map(
      (typeId) => entries.find((entry) => entry.template.type_id === typeId)!,
    ),
  };
}

