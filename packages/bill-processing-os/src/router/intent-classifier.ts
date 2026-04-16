import type { ExecutionMode } from "../domain/execution.js";

export interface IntentClassificationInput {
  user_intent?: string;
  file_count: number;
  prior_run?: {
    failure_reason?: string | null;
    execution_mode?: ExecutionMode | null;
  } | null;
}

function hasIntent(userIntent: string | undefined, pattern: RegExp) {
  return Boolean(userIntent && pattern.test(userIntent));
}

export function classifyExecutionMode(input: IntentClassificationInput): ExecutionMode {
  const userIntent = input.user_intent?.trim();

  if (hasIntent(userIntent, /repair|fix|rerun/i) || input.prior_run?.failure_reason) {
    return "repair";
  }

  if (hasIntent(userIntent, /manual.*review|review/i)) {
    return "manual_review";
  }

  if (hasIntent(userIntent, /onboard|new\s+type|unknown\s+type/i)) {
    return "type_onboarding";
  }

  if (hasIntent(userIntent, /backfill|historical/i)) {
    return "backfill";
  }

  if (input.file_count > 1) {
    return "batch_process";
  }

  return "new_entry";
}
