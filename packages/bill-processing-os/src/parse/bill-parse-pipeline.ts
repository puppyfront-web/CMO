import { createBillDocument, type BillDocument } from "../domain/bill-document.js";
import type { ComplexityFlag } from "../domain/execution.js";
import { adaptMarkdown } from "./markdown-adapter.js";
import { adaptOcr } from "./ocr-adapter.js";
import { detectHandwritingSignals } from "./handwriting-detector.js";
import { preprocessDocument, type ParseSourceInput, type PreprocessResult } from "./preprocess.js";

export interface BillParsePipelineResult {
  document: BillDocument;
  input_kind: PreprocessResult["input_kind"];
  preprocessed: PreprocessResult;
  replay_artifacts: {
    raw_json: string;
    handwriting_json: string;
  };
  complexity_flags: ComplexityFlag[];
}

export function parseBillDocument(input: ParseSourceInput): BillParsePipelineResult {
  const preprocessed = preprocessDocument(input);
  const markdown = adaptMarkdown(preprocessed);
  const ocrArtifact = adaptOcr(preprocessed);
  const handwritingSignals = detectHandwritingSignals(preprocessed);
  const document = createBillDocument({
    doc_id: input.doc_id,
    file_url: input.file_url,
    source_filename: input.source_filename,
  });
  const updatedAt = new Date().toISOString();

  document.status = "PARSED";
  document.raw = {
    markdown,
    ocr_text: ocrArtifact.ocr_text,
    image_meta: ocrArtifact.image_meta,
  };
  document.handwriting = handwritingSignals.handwriting;
  document.complexity_flags = handwritingSignals.complexity_flags;
  document.audit.updated_at = updatedAt;

  return {
    document,
    input_kind: preprocessed.input_kind,
    preprocessed,
    replay_artifacts: {
      raw_json: JSON.stringify(document.raw),
      handwriting_json: JSON.stringify(document.handwriting),
    },
    complexity_flags: handwritingSignals.complexity_flags,
  };
}
