import type { BillDocumentHandwriting } from "../domain/bill-document.js";
import type { ComplexityFlag } from "../domain/execution.js";
import type { PreprocessResult } from "./preprocess.js";

export interface HandwritingSignalResult {
  handwriting: BillDocumentHandwriting;
  complexity_flags: ComplexityFlag[];
}

export function detectHandwritingSignals(
  preprocessed: PreprocessResult,
): HandwritingSignalResult {
  const annotations = preprocessed.handwriting.map((annotation) => ({
    page: annotation.page,
    text: annotation.text,
    confidence: annotation.confidence,
    override_candidate: annotation.override_candidate ?? false,
  }));

  const hasHandwriting = annotations.length > 0;
  const hasAnyText = preprocessed.markdown.length > 0 || preprocessed.ocr_text.length > 0;
  const hasOverrideCandidate = annotations.some((annotation) => annotation.override_candidate);

  const complexityFlags: ComplexityFlag[] = [];

  if (hasHandwriting) {
    complexityFlags.push("printed_with_handwriting");
  }

  if (hasOverrideCandidate) {
    complexityFlags.push("override_detected");
  }

  if (!hasHandwriting && !hasAnyText) {
    complexityFlags.push("uncertain_document");
  }

  if (
    complexityFlags.length === 0 &&
    (preprocessed.input_kind === "image" || preprocessed.input_kind === "text_pdf")
  ) {
    complexityFlags.push("clean_printed");
  }

  return {
    handwriting: {
      has_handwriting: hasHandwriting,
      annotations,
    },
    complexity_flags: complexityFlags.length > 0 ? complexityFlags : ["clean_printed"],
  };
}
