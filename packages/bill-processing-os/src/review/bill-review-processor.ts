import type { BillDocument } from "../domain/bill-document.js";
import { createReviewTask, type ReviewTask } from "../domain/review-task.js";
import type { BillTypeTemplate } from "../domain/bill-template.js";
import type { BillValidationResult } from "../validate/validation-engine.js";
import { validateBillDocument } from "../validate/validation-engine.js";
import type { ReviewReason } from "./review-reason.js";
import { mergeCorrectionsIntoBillDocument, type CorrectionAuditEntry } from "./correction-merge.js";

export interface BuildReviewTaskInput {
  task_id: string;
  reason: ReviewReason | string;
  fields_to_review?: string[];
  candidate_values?: Record<string, unknown[]>;
  evidence?: Record<string, string[]>;
}

export interface ReviewCorrectionResult {
  document: BillDocument;
  review_task: ReviewTask;
  validation: BillValidationResult;
  audit_trail: CorrectionAuditEntry[];
}

function uniqueFields(fields: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const field of fields) {
    if (!seen.has(field)) {
      seen.add(field);
      result.push(field);
    }
  }

  return result;
}

export function buildReviewTaskFromDocument(
  document: BillDocument,
  input: BuildReviewTaskInput,
): ReviewTask {
  const fields_to_review = uniqueFields([
    ...(input.fields_to_review ?? []),
    ...document.validation.missing_fields,
  ]);

  return createReviewTask({
    task_id: input.task_id,
    doc_id: document.doc_id,
    reason: input.reason,
    fields_to_review,
    candidate_values: input.candidate_values,
    evidence: input.evidence,
  });
}

export function applyReviewCorrections(
  document: BillDocument,
  reviewTask: ReviewTask,
  corrections: Record<string, unknown>,
  template?: BillTypeTemplate,
): ReviewCorrectionResult {
  const merged = mergeCorrectionsIntoBillDocument(
    document,
    corrections,
    reviewTask.task_id,
    reviewTask.reason,
  );
  const validation = validateBillDocument(merged.document, template);
  const review_task = createReviewTask({
    task_id: reviewTask.task_id,
    doc_id: reviewTask.doc_id,
    reason: reviewTask.reason,
    fields_to_review: reviewTask.fields_to_review,
    candidate_values: reviewTask.candidate_values,
    evidence: reviewTask.evidence,
    corrections: {
      ...reviewTask.corrections,
      ...corrections,
    },
    status: validation.is_valid ? "completed" : "in_review",
  });

  merged.document.review_task_id = reviewTask.task_id;
  merged.document.validation = validation;
  merged.document.status = validation.is_valid ? "VALIDATED" : "REVIEW_REQUIRED";

  return {
    document: merged.document,
    review_task,
    validation,
    audit_trail: merged.audit_trail,
  };
}
