export type InputKind = "image" | "text_pdf" | "scanned_pdf";

export interface HandwritingAnnotationInput {
  page: number;
  text: string;
  confidence: number;
  override_candidate?: boolean;
}

export interface ParseSourceInput {
  doc_id: string;
  file_url: string;
  source_filename: string;
  mime_type: string;
  markdown?: string;
  ocr_text?: string;
  image_meta?: Record<string, unknown>;
  handwriting?: HandwritingAnnotationInput[];
}

export interface PreprocessResult {
  input_kind: InputKind;
  has_text_layer: boolean;
  has_handwriting: boolean;
  page_count: number;
  source_filename: string;
  file_url: string;
  mime_type: string;
  markdown: string;
  ocr_text: string;
  image_meta: Record<string, unknown>;
  handwriting: HandwritingAnnotationInput[];
}

function hasImageExtension(sourceFilename: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(sourceFilename);
}

function hasPdfExtension(sourceFilename: string): boolean {
  return /\.pdf$/i.test(sourceFilename);
}

function inferPageCount(imageMeta?: Record<string, unknown>): number {
  const pageCount = imageMeta?.page_count;
  if (typeof pageCount === "number" && Number.isFinite(pageCount)) {
    return pageCount;
  }

  const pages = imageMeta?.pages;
  if (typeof pages === "number" && Number.isFinite(pages)) {
    return pages;
  }

  return 1;
}

export function preprocessDocument(input: ParseSourceInput): PreprocessResult {
  const markdown = input.markdown?.trim() ?? "";
  const ocrText = input.ocr_text?.trim() ?? "";
  const handwriting = input.handwriting ?? [];
  const mimeType = input.mime_type.toLowerCase();
  const pageCount = inferPageCount(input.image_meta);

  let inputKind: InputKind;
  if (mimeType.startsWith("image/") || hasImageExtension(input.source_filename)) {
    inputKind = "image";
  } else if (
    hasPdfExtension(input.source_filename) ||
    mimeType === "application/pdf"
  ) {
    inputKind = markdown.length > 0 && ocrText.length === 0 && handwriting.length === 0
      ? "text_pdf"
      : "scanned_pdf";
  } else {
    inputKind = "image";
  }

  return {
    input_kind: inputKind,
    has_text_layer: markdown.length > 0 || ocrText.length > 0,
    has_handwriting: handwriting.length > 0,
    page_count: pageCount,
    source_filename: input.source_filename,
    file_url: input.file_url,
    mime_type: input.mime_type,
    markdown,
    ocr_text: ocrText,
    image_meta: {
      ...(input.image_meta ?? {}),
      mime_type: input.mime_type,
      page_count: pageCount,
      source_filename: input.source_filename,
      source_kind: inputKind,
    },
    handwriting,
  };
}
