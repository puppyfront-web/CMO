import { createBillDocument, type BillDocument } from "./domain/bill-document.js";
import type { BillTypeTemplate, TemplateFeatures } from "./domain/bill-template.js";
import type { ExcelTemplateMapping } from "./domain/excel-mapping.js";
import { parseBillDocument } from "./parse/bill-parse-pipeline.js";
import type { ParseSourceInput } from "./parse/preprocess.js";
import { runBillExtractionPipeline } from "./extract/bill-extraction-pipeline.js";
import { createTemplateRepository, type TemplateRepository } from "./template/template-repository.js";
import { createTemplateIndex } from "./type-match/template-index.js";
import { matchBillTypes } from "./type-match/bill-type-matcher.js";
import type { DuplicateCandidate } from "./validate/dedupe-guard.js";
import { runBillValidationPipeline } from "./validate/bill-validation-pipeline.js";
import { writeBillDocument, createWorkbookState, type WorkbookState } from "./write/bill-excel-writer.js";
import { buildReviewTaskFromDocument } from "./review/bill-review-processor.js";
import { buildBillTemplate } from "./template/bill-template-builder.js";
import { routeBillTask, type BillTaskRoute, type BillTaskRouteInput } from "./router/bill-task-router.js";
import { createRunStore, type RunHandle } from "./storage/run-store.js";
import { createDocumentStore } from "./storage/document-store.js";
import { createEventLog } from "./storage/event-log.js";
import { createStructuredLogger } from "./storage/logger.js";
import { runBillReflection } from "./reflection/reflection-engine.js";

export interface OnboardingRequest {
  type_id: string;
  observed_layout: TemplateFeatures;
  excel_mapping: ExcelTemplateMapping;
  field_mapping?: Record<string, string[]>;
  confidence_threshold?: number;
  post_rules?: string[];
}

export interface BillTaskPipelineInput {
  sources: ParseSourceInput[];
  user_intent?: string;
  context?: BillTaskRouteInput["context"];
  templates?: BillTypeTemplate[];
  excel_mappings?: ExcelTemplateMapping[];
  duplicate_candidates?: DuplicateCandidate[];
  onboarding_requests?: Record<string, OnboardingRequest>;
  home_dir?: string;
  workbook?: WorkbookState;
}

export interface DocumentProcessingResult {
  document: ReturnType<typeof createBillDocument>;
  decision: "AUTO_WRITE" | "USER_CONFIRM" | "REVIEW_REQUIRED" | "TYPE_ONBOARDING" | "REJECTED";
  type_match: number;
  template_id: string | null;
  review_task_id: string | null;
}

export interface PipelineSummary {
  total: number;
  written: number;
  review_required: number;
  user_confirm: number;
  type_onboarding: number;
  rejected: number;
}

export interface BillTaskPipelineResult {
  task: BillTaskRoute;
  run: RunHandle;
  documents: DocumentProcessingResult[];
  summary: PipelineSummary;
  workbook: WorkbookState;
  repository: TemplateRepository;
}

function averageConfidence(values: Record<string, number>): number {
  const numbers = Object.values(values);
  if (numbers.length === 0) {
    return 0;
  }

  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(4));
}

function extractHeaders(markdown: string): string[] {
  const firstTableRow = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("|"));

  if (!firstTableRow) {
    return [];
  }

  return firstTableRow
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function buildSearchText(source: ParseSourceInput, parsedMarkdown: string, parsedOcrText: string): string {
  const handwritingText = (source.handwriting ?? [])
    .map((annotation) => annotation.text)
    .filter(Boolean)
    .join("\n");

  return [parsedMarkdown, parsedOcrText, handwritingText].filter(Boolean).join("\n");
}

function createSummary(documents: DocumentProcessingResult[]): PipelineSummary {
  return {
    total: documents.length,
    written: documents.filter((document) => document.decision === "AUTO_WRITE").length,
    review_required: documents.filter((document) => document.decision === "REVIEW_REQUIRED").length,
    user_confirm: documents.filter((document) => document.decision === "USER_CONFIRM").length,
    type_onboarding: documents.filter((document) => document.decision === "TYPE_ONBOARDING").length,
    rejected: documents.filter((document) => document.decision === "REJECTED").length,
  };
}

export async function runBillTaskPipeline(
  input: BillTaskPipelineInput,
): Promise<BillTaskPipelineResult> {
  const repository = createTemplateRepository({
    templates: input.templates,
    excelMappings: input.excel_mappings,
  });

  const task = routeBillTask({
    file_urls: input.sources.map((source) => source.file_url),
    user_intent: input.user_intent,
    context: {
      ...(input.context ?? {}),
      doc_ids: input.sources.map((source) => source.doc_id),
    },
  });

  const runStore = createRunStore({ homeDir: input.home_dir });
  const run = await runStore.startRun({
    task_id: task.task_id,
    started_at: new Date().toISOString(),
    execution_mode: task.intent,
    user_intent: input.user_intent ?? "",
    file_urls: input.sources.map((source) => source.file_url),
    doc_ids: input.sources.map((source) => source.doc_id),
    context: task.task_context as unknown as Record<string, unknown>,
  });
  const documentStore = createDocumentStore(run.run_dir);
  const eventLog = createEventLog(run.run_dir);
  const logger = createStructuredLogger(eventLog, task.task_id);
  let workbook = input.workbook ?? createWorkbookState();
  const results: DocumentProcessingResult[] = [];

  for (const source of input.sources) {
    await logger.layerStart("parse", { doc_id: source.doc_id });
    const parseResult = parseBillDocument(source);
    let document: BillDocument = {
      ...parseResult.document,
      page_count: parseResult.preprocessed.page_count,
    };
    await logger.stateTransition(source.doc_id, "UPLOADED", "PARSED");
    await logger.layerEnd("parse", { doc_id: source.doc_id });

    const headers = extractHeaders(document.raw.markdown);
    const typeMatch = matchBillTypes(createTemplateIndex(repository.listTemplates()), {
      text: buildSearchText(source, document.raw.markdown, document.raw.ocr_text),
      headers,
      layout_features: document.complexity_flags,
    });
    const template = typeMatch.matched_template ?? undefined;
    document.type_id = template?.type_id ?? null;

    await logger.layerStart("extract", { doc_id: source.doc_id });
    const extraction = runBillExtractionPipeline({ document, template });
    document = {
      ...extraction.document,
      status: "EXTRACTED",
      confidence_score: averageConfidence(extraction.field_confidences),
    };
    const reflection = runBillReflection({
      document,
      confidence_score: document.confidence_score,
    });
    document = {
      ...reflection.document,
      confidence_score: reflection.adjusted_confidence_score,
    };
    await logger.stateTransition(source.doc_id, "PARSED", "EXTRACTED");
    await logger.layerEnd("extract", { doc_id: source.doc_id });

    await logger.layerStart("validate", { doc_id: source.doc_id });
    const validation = runBillValidationPipeline({
      document,
      template,
      duplicate_candidates: input.duplicate_candidates,
      type_match_score: typeMatch.type_match,
      confidence_score: document.confidence_score,
      handwriting_override_detected: document.complexity_flags.includes("override_detected"),
      conflict_detected: reflection.force_review,
      execution_mode: task.intent,
    });
    document = {
      ...document,
      status: "VALIDATED",
      validation: validation.validation,
    };
    await logger.stateTransition(source.doc_id, "EXTRACTED", "VALIDATED");
    await logger.decision(source.doc_id, validation.decision, {
      type_match: typeMatch.type_match,
      confidence_score: document.confidence_score,
    });
    await logger.layerEnd("validate", { doc_id: source.doc_id });

    let review_task_id: string | null = null;

    if (validation.decision === "AUTO_WRITE" && template) {
      const mapping = repository.getExcelMapping(template.excel_mapping_id);
      if (mapping) {
        const writeResult = writeBillDocument(document, mapping, workbook, {
          mode: task.intent === "repair" ? "repair" : "append",
        });
        workbook = writeResult.workbook;
        document.status = "WRITTEN";
      } else {
        document.status = "REVIEW_REQUIRED";
      }
    } else if (validation.decision === "REVIEW_REQUIRED") {
      const reviewTask = buildReviewTaskFromDocument(document, {
        task_id: `${task.task_id}-${source.doc_id}-review`,
        reason: document.validation.missing_fields.length > 0 ? "missing_fields" : "low_confidence",
      });
      review_task_id = reviewTask.task_id;
      document.review_task_id = reviewTask.task_id;
      document.status = "REVIEW_REQUIRED";
    } else if (validation.decision === "TYPE_ONBOARDING") {
      const request = input.onboarding_requests?.[source.doc_id];
      if (request) {
        const bundle = buildBillTemplate({
          type_id: request.type_id,
          normalized: document.normalized,
          observed_layout: request.observed_layout,
          excel_mapping: request.excel_mapping,
          field_mapping: request.field_mapping,
          confidence_threshold: request.confidence_threshold,
          post_rules: request.post_rules,
        });
        repository.saveTemplate(bundle.template);
        repository.saveExcelMapping(bundle.excel_mapping);
      }
      document.status = "TYPE_ONBOARDING";
    } else if (validation.decision === "REJECTED") {
      document.status = "REJECTED";
    }

    document.validation = validation.validation;
    document.confidence_score = validation.confidence.confidence_score;

    await documentStore.writeDocumentSnapshots(source.doc_id, {
      raw: document.raw,
      parsed: document.parsed,
      normalized: document.normalized,
      validation: document.validation,
      artifacts: {
        field_confidences: extraction.field_confidences,
        field_candidates: extraction.field_candidates,
        reflection,
        route: validation.route,
        parse_result: {
          input_kind: parseResult.input_kind,
          preprocessed: parseResult.preprocessed,
        },
      },
    });

    results.push({
      document,
      decision: validation.decision,
      type_match: typeMatch.type_match,
      template_id: template?.type_id ?? null,
      review_task_id,
    });
  }

  return {
    task,
    run,
    documents: results,
    summary: createSummary(results),
    workbook,
    repository,
  };
}
