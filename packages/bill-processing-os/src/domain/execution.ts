export const DOCUMENT_STATES = [
  "UPLOADED",
  "PREPROCESSED",
  "PARSED",
  "EXTRACTED",
  "VALIDATED",
  "AUTO_WRITE",
  "REVIEW_REQUIRED",
  "TYPE_ONBOARDING",
  "WRITTEN",
  "REJECTED",
] as const;

export type DocumentState = (typeof DOCUMENT_STATES)[number];

export const EXECUTION_MODES = [
  "new_entry",
  "backfill",
  "repair",
  "batch_process",
  "type_onboarding",
  "manual_review",
] as const;

export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export const COMPLEXITY_FLAGS = [
  "clean_printed",
  "printed_with_handwriting",
  "override_detected",
  "uncertain_document",
] as const;

export type ComplexityFlag = (typeof COMPLEXITY_FLAGS)[number];
