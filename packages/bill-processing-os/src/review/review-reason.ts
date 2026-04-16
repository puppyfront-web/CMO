export const REVIEW_REASONS = [
  "low_confidence",
  "missing_required_field",
  "handwriting_override",
  "dedupe_conflict",
  "field_conflict",
  "type_onboarding",
] as const;

export type ReviewReason = (typeof REVIEW_REASONS)[number];
