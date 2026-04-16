import type { ExecutionMode } from "../domain/execution.js";
import { buildTaskContext, type BuildTaskContextInput, type TaskContext } from "./context-builder.js";
import { classifyExecutionMode } from "./intent-classifier.js";

export interface BillTaskRouteInput extends BuildTaskContextInput {
  context?: BuildTaskContextInput["context"] & {
    task_id?: string;
    type_match?: number;
  };
}

export interface BillTaskRoute {
  intent: ExecutionMode;
  type_match: number;
  action: string;
  task_id: string;
  doc_ids: string[];
  task_context: TaskContext;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveTaskId(input: BillTaskRouteInput, executionMode: ExecutionMode, fileCount: number) {
  const explicitTaskId = input.context?.task_id;
  if (explicitTaskId) {
    return explicitTaskId;
  }

  const source = input.file_url ?? input.file_urls?.[0] ?? "task";
  const fileSlug = slugify(source.split("/").pop() ?? source) || "task";
  return `${executionMode}-${fileCount}-${fileSlug}`;
}

function deriveTypeMatch(
  input: BillTaskRouteInput,
  executionMode: ExecutionMode,
  context: TaskContext,
) {
  if (typeof input.context?.type_match === "number") {
    return input.context.type_match;
  }

  if (executionMode === "new_entry" && context.file_count === 1) {
    return 0.82;
  }

  if (executionMode === "batch_process") {
    return 0.74;
  }

  if (executionMode === "repair") {
    return 0.78;
  }

  if (executionMode === "manual_review") {
    return 0.5;
  }

  if (executionMode === "type_onboarding") {
    return 0.42;
  }

  return 0.7;
}

function deriveAction(executionMode: ExecutionMode) {
  switch (executionMode) {
    case "repair":
    case "manual_review":
      return "review_and_replay";
    case "type_onboarding":
      return "onboard_type";
    case "batch_process":
      return "parse_batch";
    default:
      return "parse_and_confirm";
  }
}

export function routeBillTask(input: BillTaskRouteInput): BillTaskRoute {
  const taskContext = buildTaskContext(input);
  const intent = classifyExecutionMode({
    user_intent: input.user_intent,
    file_count: taskContext.file_count,
    prior_run: input.context?.prior_run ?? null,
  });

  return {
    intent,
    type_match: deriveTypeMatch(input, intent, taskContext),
    action: deriveAction(intent),
    task_id: deriveTaskId(input, intent, taskContext.file_count),
    doc_ids: taskContext.doc_ids,
    task_context: taskContext,
  };
}
