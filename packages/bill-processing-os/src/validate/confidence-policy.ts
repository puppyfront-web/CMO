export type ConfidenceDecision =
  | "AUTO_WRITE"
  | "USER_CONFIRM"
  | "REVIEW_REQUIRED"
  | "TYPE_ONBOARDING";

export interface ConfidencePolicyInput {
  type_match_score: number;
  confidence_score: number;
  handwriting_override_detected?: boolean;
  conflict_detected?: boolean;
}

export interface ConfidencePolicyResult {
  decision: ConfidenceDecision;
  confidence_score: number;
  reasons: string[];
  handwriting_override_detected: boolean;
  conflict_detected: boolean;
}

export function applyConfidencePolicy(
  input: ConfidencePolicyInput,
): ConfidencePolicyResult {
  const handwriting_override_detected = input.handwriting_override_detected === true;
  const conflict_detected = input.conflict_detected === true;
  const reasons: string[] = [];

  if (handwriting_override_detected) {
    reasons.push("handwriting_override_detected");
  }

  if (conflict_detected) {
    reasons.push("conflict_detected");
  }

  if (handwriting_override_detected || conflict_detected) {
    return {
      decision: "REVIEW_REQUIRED",
      confidence_score: input.confidence_score,
      reasons,
      handwriting_override_detected,
      conflict_detected,
    };
  }

  if (input.type_match_score < 0.6) {
    return {
      decision: "TYPE_ONBOARDING",
      confidence_score: input.confidence_score,
      reasons: ["type_match_below_threshold"],
      handwriting_override_detected,
      conflict_detected,
    };
  }

  if (input.type_match_score > 0.9 && input.confidence_score > 0.9) {
    return {
      decision: "AUTO_WRITE",
      confidence_score: input.confidence_score,
      reasons: ["high_type_match", "high_confidence"],
      handwriting_override_detected,
      conflict_detected,
    };
  }

  if (input.confidence_score > 0.7 && input.confidence_score < 0.9) {
    return {
      decision: "USER_CONFIRM",
      confidence_score: input.confidence_score,
      reasons: ["mid_confidence"],
      handwriting_override_detected,
      conflict_detected,
    };
  }

  return {
    decision: "REVIEW_REQUIRED",
    confidence_score: input.confidence_score,
    reasons: ["low_confidence"],
    handwriting_override_detected,
    conflict_detected,
  };
}
