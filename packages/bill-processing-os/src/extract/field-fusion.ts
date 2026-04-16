import type { BillTypeTemplate } from "../domain/bill-template.js";
import type { BillDocumentParsed } from "../domain/bill-document.js";
import type { BillExtractionDraft, ExtractionCandidate } from "./llm-extractor.js";

export interface FusionResult {
  parsed: BillDocumentParsed;
  fieldConfidences: Record<string, number>;
  fieldCandidates: BillExtractionDraft["fields"];
}

const SOURCE_PRIORITY: Record<ExtractionCandidate["source"], number> = {
  handwriting: 3,
  markdown: 2,
  ocr: 1,
};

export function fuseExtractionDraft(
  draft: BillExtractionDraft,
  _template?: BillTypeTemplate | null,
): FusionResult {
  const parsedFields: Record<string, unknown> = {};
  const fieldConfidences: Record<string, number> = {};
  const parsedItems: Array<Record<string, unknown>> = [];

  for (const [fieldName, candidates] of Object.entries(draft.fields)) {
    const selected = selectBestCandidate(candidates);
    if (!selected) {
      continue;
    }

    parsedFields[fieldName] = selected.value;
    fieldConfidences[fieldName] = selected.confidence;
  }

  for (const row of draft.items) {
    const parsedRow: Record<string, unknown> = {};
    for (const [fieldName, candidates] of Object.entries(row)) {
      const selected = selectBestCandidate(candidates);
      if (!selected) {
        continue;
      }

      parsedRow[fieldName] = selected.value;
    }

    if (Object.keys(parsedRow).length > 0) {
      parsedItems.push(parsedRow);
    }
  }

  if (!parsedFields.currency) {
    parsedFields.currency = "CNY";
    fieldConfidences.currency = fieldConfidences.currency ?? 0.75;
  }

  return {
    parsed: {
      fields: parsedFields,
      items: parsedItems,
    },
    fieldConfidences,
    fieldCandidates: draft.fields,
  };
}

function selectBestCandidate(candidates: ExtractionCandidate[]): ExtractionCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    const priorityDelta = SOURCE_PRIORITY[right.source] - SOURCE_PRIORITY[left.source];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return right.confidence - left.confidence;
  })[0];
}
