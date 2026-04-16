import type { PreprocessResult } from "./preprocess.js";

export interface OcrArtifact {
  ocr_text: string;
  image_meta: Record<string, unknown>;
}

export function adaptOcr(preprocessed: PreprocessResult): OcrArtifact {
  return {
    ocr_text: preprocessed.ocr_text,
    image_meta: {
      ...preprocessed.image_meta,
      input_kind: preprocessed.input_kind,
    },
  };
}
