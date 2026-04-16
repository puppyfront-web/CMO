import type { BillDocument, BillDocumentValidation } from "../domain/bill-document.js";
import type { ExecutionMode } from "../domain/execution.js";
import type { ConfidencePolicyInput, ConfidencePolicyResult } from "./confidence-policy.js";
import { applyConfidencePolicy } from "./confidence-policy.js";
import type { DuplicateResult } from "./dedupe-guard.js";

export type BillDecision =
  | "AUTO_WRITE"
  | "USER_CONFIRM"
  | "REVIEW_REQUIRED"
  | "TYPE_ONBOARDING"
  | "REJECTED";

export interface RouteBillDocumentInput extends ConfidencePolicyInput {
  document: BillDocument;
  validation: BillDocumentValidation;
  duplicate_result: DuplicateResult;
  execution_mode: ExecutionMode;
}

export interface RouteBillDocumentResult {
  decision: BillDecision;
  confidence: ConfidencePolicyResult;
  validation: BillDocumentValidation;
  duplicate_result: DuplicateResult;
}

export function routeBillDocument(
  input: RouteBillDocumentInput,
): RouteBillDocumentResult {
  const confidence = applyConfidencePolicy({
    type_match_score: input.type_match_score,
    confidence_score: input.confidence_score,
    handwriting_override_detected: input.handwriting_override_detected,
    conflict_detected: input.conflict_detected,
  });

  if (confidence.decision === "TYPE_ONBOARDING") {
    return {
      decision: "TYPE_ONBOARDING",
      confidence,
      validation: input.validation,
      duplicate_result: input.duplicate_result,
    };
  }

  if (input.duplicate_result.is_duplicate) {
    return {
      decision: input.execution_mode === "repair" ? "REVIEW_REQUIRED" : "REJECTED",
      confidence,
      validation: input.validation,
      duplicate_result: input.duplicate_result,
    };
  }

  if (!input.validation.is_valid) {
    return {
      decision: "REVIEW_REQUIRED",
      confidence,
      validation: input.validation,
      duplicate_result: input.duplicate_result,
    };
  }

  return {
    decision: confidence.decision,
    confidence,
    validation: input.validation,
    duplicate_result: input.duplicate_result,
  };
}
