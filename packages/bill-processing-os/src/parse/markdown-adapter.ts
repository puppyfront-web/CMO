import type { PreprocessResult } from "./preprocess.js";

export function adaptMarkdown(preprocessed: PreprocessResult): string {
  if (preprocessed.markdown.length > 0) {
    return preprocessed.markdown;
  }

  if (preprocessed.ocr_text.length > 0) {
    return preprocessed.ocr_text;
  }

  return "";
}
