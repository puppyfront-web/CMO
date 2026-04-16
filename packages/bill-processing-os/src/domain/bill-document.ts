import type { ComplexityFlag, DocumentState, ExecutionMode } from "./execution.js";

export interface BillDocumentRaw {
  markdown: string;
  ocr_text: string;
  image_meta: Record<string, unknown>;
}

export interface BillDocumentParsed {
  fields: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
}

export interface BillDocumentValidation {
  is_valid: boolean;
  warnings: string[];
  missing_fields: string[];
}

export interface BillDocumentHandwriting {
  has_handwriting: boolean;
  annotations: Array<Record<string, unknown>>;
}

export interface BillDocumentAudit {
  created_at: string;
  updated_at: string;
}

export interface BillDocument {
  doc_id: string;
  file_url: string;
  source_filename: string;
  doc_type: string;
  doc_hash: string | null;
  page_count: number | null;
  status: DocumentState;
  intent: ExecutionMode;
  type_id: string | null;
  confidence_score: number;
  complexity_flags: ComplexityFlag[];
  processing_trace_id: string | null;
  template_candidates: string[];
  review_task_id: string | null;
  raw: BillDocumentRaw;
  parsed: BillDocumentParsed;
  normalized: BillDocumentParsed;
  validation: BillDocumentValidation;
  handwriting: BillDocumentHandwriting;
  audit: BillDocumentAudit;
}

export function createBillDocument(input: {
  doc_id: string;
  file_url: string;
  source_filename: string;
}): BillDocument {
  const now = new Date().toISOString();

  return {
    doc_id: input.doc_id,
    file_url: input.file_url,
    source_filename: input.source_filename,
    doc_type: "",
    doc_hash: null,
    page_count: null,
    status: "UPLOADED",
    intent: "new_entry",
    type_id: null,
    confidence_score: 0,
    complexity_flags: [],
    processing_trace_id: null,
    template_candidates: [],
    review_task_id: null,
    raw: {
      markdown: "",
      ocr_text: "",
      image_meta: {},
    },
    parsed: {
      fields: {},
      items: [],
    },
    normalized: {
      fields: {},
      items: [],
    },
    validation: {
      is_valid: false,
      warnings: [],
      missing_fields: [],
    },
    handwriting: {
      has_handwriting: false,
      annotations: [],
    },
    audit: {
      created_at: now,
      updated_at: now,
    },
  };
}
