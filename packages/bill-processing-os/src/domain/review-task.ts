export type ReviewTaskStatus = "pending" | "in_review" | "completed" | "rejected";

export interface ReviewTask {
  task_id: string;
  doc_id: string;
  reason: string;
  fields_to_review: string[];
  status: ReviewTaskStatus;
  candidate_values: Record<string, unknown[]>;
  evidence: Record<string, string[]>;
  corrections: Record<string, unknown>;
}

export function createReviewTask(
  input: Pick<ReviewTask, "task_id" | "doc_id" | "reason" | "fields_to_review"> & {
    status?: ReviewTaskStatus;
    candidate_values?: Record<string, unknown[]>;
    evidence?: Record<string, string[]>;
    corrections?: Record<string, unknown>;
  },
): ReviewTask {
  return {
    task_id: input.task_id,
    doc_id: input.doc_id,
    reason: input.reason,
    fields_to_review: input.fields_to_review,
    status: input.status ?? "pending",
    candidate_values: input.candidate_values ?? {},
    evidence: input.evidence ?? {},
    corrections: input.corrections ?? {},
  };
}
