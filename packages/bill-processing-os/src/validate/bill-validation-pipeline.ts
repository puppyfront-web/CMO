import type { BillDocument } from "../domain/bill-document.js";
import type { BillTypeTemplate } from "../domain/bill-template.js";
import type { ExecutionMode } from "../domain/execution.js";
import type { ConfidencePolicyResult } from "./confidence-policy.js";
import { applyConfidencePolicy } from "./confidence-policy.js";
import type { DuplicateCandidate, DuplicateResult } from "./dedupe-guard.js";
import { detectBillDuplicate } from "./dedupe-guard.js";
import type { BillDecision, RouteBillDocumentResult } from "./routing-engine.js";
import { routeBillDocument } from "./routing-engine.js";
import type { BillValidationResult } from "./validation-engine.js";
import { validateBillDocument } from "./validation-engine.js";

export interface BillValidationPipelineInput {
  document: BillDocument;
  template?: BillTypeTemplate;
  duplicate_candidates?: DuplicateCandidate[];
  type_match_score: number;
  confidence_score: number;
  handwriting_override_detected?: boolean;
  conflict_detected?: boolean;
  execution_mode?: ExecutionMode;
}

export interface BillValidationPipelineResult {
  validation: BillValidationResult;
  confidence: ConfidencePolicyResult;
  dedupe_result: DuplicateResult;
  decision: BillDecision;
  route: RouteBillDocumentResult;
}

export function runBillValidationPipeline(
  input: BillValidationPipelineInput,
): BillValidationPipelineResult {
  const validation = validateBillDocument(input.document, input.template);
  const confidence = applyConfidencePolicy({
    type_match_score: input.type_match_score,
    confidence_score: input.confidence_score,
    handwriting_override_detected: input.handwriting_override_detected,
    conflict_detected: input.conflict_detected,
  });
  const dedupe_result = detectBillDuplicate(
    input.document,
    input.duplicate_candidates ?? [],
  );
  const route = routeBillDocument({
    document: input.document,
    validation,
    duplicate_result: dedupe_result,
    execution_mode: input.execution_mode ?? "new_entry",
    type_match_score: input.type_match_score,
    confidence_score: input.confidence_score,
    handwriting_override_detected: input.handwriting_override_detected,
    conflict_detected: input.conflict_detected,
  });

  return {
    validation,
    confidence,
    dedupe_result,
    decision: route.decision,
    route,
  };
}
