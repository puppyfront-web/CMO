import type { BillDocument } from "../domain/bill-document.js";
import type { BillTypeTemplate } from "../domain/bill-template.js";
import { fuseExtractionDraft } from "./field-fusion.js";
import { extractBillDraft } from "./llm-extractor.js";
import { normalizeBillParsed } from "./normalizer.js";

export interface BillExtractionPipelineInput {
  document: BillDocument;
  template?: BillTypeTemplate | null;
}

export interface BillExtractionPipelineResult {
  document: BillDocument;
  field_confidences: Record<string, number>;
  field_candidates: ReturnType<typeof extractBillDraft>["fields"];
}

export function runBillExtractionPipeline(
  input: BillExtractionPipelineInput,
): BillExtractionPipelineResult {
  const draft = extractBillDraft(input.document, input.template ?? null);
  const fused = fuseExtractionDraft(draft, input.template ?? null);
  const normalized = normalizeBillParsed(fused.parsed);

  const document: BillDocument = {
    ...input.document,
    parsed: fused.parsed,
    normalized,
  };

  return {
    document,
    field_confidences: fused.fieldConfidences,
    field_candidates: fused.fieldCandidates,
  };
}
