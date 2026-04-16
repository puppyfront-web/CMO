import type { ExecutionMode } from "../domain/execution.js";
import { classifyExecutionMode } from "./intent-classifier.js";

export interface TargetExcelContext {
  workbook_path: string | null;
  sheet: string | null;
  start_row: number | null;
}

export interface TemplateSummary {
  type_id: string;
  version: number;
}

export interface PriorRunSummary {
  task_id: string;
  execution_mode: ExecutionMode | null;
  failure_reason: string | null;
  doc_ids: string[];
}

export interface RepairMetadata {
  enabled: boolean;
  source_task_id: string | null;
  failure_reason: string | null;
}

export interface TaskContext {
  execution_mode: ExecutionMode;
  file_count: number;
  doc_ids: string[];
  target_excel: TargetExcelContext;
  template_set: TemplateSummary[];
  prior_run: PriorRunSummary | null;
  repair: RepairMetadata;
}

export interface BuildTaskContextInput {
  file_url?: string;
  file_urls?: string[];
  user_intent?: string;
  context?: {
    task_id?: string;
    doc_ids?: string[];
    target_excel?: Partial<TargetExcelContext>;
    templates?: Array<string | TemplateSummary>;
    prior_run?: {
      task_id: string;
      execution_mode?: ExecutionMode | null;
      failure_reason?: string | null;
      doc_ids?: string[];
    };
    type_match?: number;
    repair?: boolean;
  };
}

function normalizeTemplateSummary(template: string | TemplateSummary): TemplateSummary {
  if (typeof template === "string") {
    return { type_id: template, version: 1 };
  }

  return {
    type_id: template.type_id,
    version: template.version ?? 1,
  };
}

function normalizeFileUrls(input: BuildTaskContextInput) {
  if (input.file_urls && input.file_urls.length > 0) {
    return input.file_urls;
  }

  return input.file_url ? [input.file_url] : [];
}

export function buildTaskContext(input: BuildTaskContextInput): TaskContext {
  const fileUrls = normalizeFileUrls(input);
  const fileCount = fileUrls.length;
  const executionMode = classifyExecutionMode({
    user_intent: input.user_intent,
    file_count: fileCount,
    prior_run: input.context?.prior_run ?? null,
  });

  const targetExcel: TargetExcelContext = {
    workbook_path: input.context?.target_excel?.workbook_path ?? null,
    sheet: input.context?.target_excel?.sheet ?? null,
    start_row: input.context?.target_excel?.start_row ?? null,
  };

  const docIds = input.context?.doc_ids ?? [];
  const priorRun = input.context?.prior_run
    ? {
        task_id: input.context.prior_run.task_id,
        execution_mode: input.context.prior_run.execution_mode ?? null,
        failure_reason: input.context.prior_run.failure_reason ?? null,
        doc_ids: input.context.prior_run.doc_ids ?? [],
      }
    : null;

  return {
    execution_mode: executionMode,
    file_count: fileCount,
    doc_ids: docIds,
    target_excel: targetExcel,
    template_set: (input.context?.templates ?? []).map(normalizeTemplateSummary),
    prior_run: priorRun,
    repair: {
      enabled: executionMode === "repair" || input.context?.repair === true,
      source_task_id: priorRun?.task_id ?? null,
      failure_reason: priorRun?.failure_reason ?? null,
    },
  };
}
