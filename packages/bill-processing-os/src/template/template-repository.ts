import type { BillTypeTemplate } from "../domain/bill-template.js";
import type { ExcelTemplateMapping } from "../domain/excel-mapping.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export interface TemplateRepository {
  saveTemplate(template: BillTypeTemplate): BillTypeTemplate;
  saveExcelMapping(mapping: ExcelTemplateMapping): ExcelTemplateMapping;
  getLatestTemplate(type_id: string): BillTypeTemplate | null;
  listTemplates(): BillTypeTemplate[];
  listTemplateVersions(type_id: string): BillTypeTemplate[];
  getExcelMapping(template_id: string): ExcelTemplateMapping | null;
}

export function createTemplateRepository(seed?: {
  templates?: BillTypeTemplate[];
  excelMappings?: ExcelTemplateMapping[];
}): TemplateRepository {
  const templateVersions = new Map<string, BillTypeTemplate[]>();
  const excelMappings = new Map<string, ExcelTemplateMapping>();

  for (const template of seed?.templates ?? []) {
    const versions = templateVersions.get(template.type_id) ?? [];
    versions.push(clone(template));
    templateVersions.set(template.type_id, versions.sort((left, right) => left.version - right.version));
  }

  for (const mapping of seed?.excelMappings ?? []) {
    excelMappings.set(mapping.template_id, clone(mapping));
  }

  function getLatestTemplate(type_id: string): BillTypeTemplate | null {
    const versions = templateVersions.get(type_id) ?? [];
    return versions.at(-1) ? clone(versions.at(-1)!) : null;
  }

  return {
    saveTemplate(template) {
      const stored = clone(template);
      const versions = templateVersions.get(stored.type_id) ?? [];
      versions.push(stored);
      versions.sort((left, right) => left.version - right.version);
      templateVersions.set(stored.type_id, versions);
      return clone(stored);
    },

    saveExcelMapping(mapping) {
      const stored = clone(mapping);
      excelMappings.set(stored.template_id, stored);
      return clone(stored);
    },

    getLatestTemplate,

    listTemplates() {
      return [...templateVersions.entries()]
        .map(([, versions]) => versions.at(-1)!)
        .filter(Boolean)
        .map((template) => clone(template))
        .sort((left, right) => left.type_id.localeCompare(right.type_id, "zh-Hans-CN"));
    },

    listTemplateVersions(type_id: string) {
      return (templateVersions.get(type_id) ?? []).map((template) => clone(template));
    },

    getExcelMapping(template_id: string) {
      const mapping = excelMappings.get(template_id);
      return mapping ? clone(mapping) : null;
    },
  };
}

