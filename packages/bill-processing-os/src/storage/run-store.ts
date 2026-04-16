import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ExecutionMode } from "../domain/execution.js";

export interface RunTaskRecord {
  task_id: string;
  started_at: string;
  execution_mode: ExecutionMode;
  user_intent: string;
  file_urls: string[];
  doc_ids: string[];
  context: Record<string, unknown>;
}

export interface RunHandle {
  task: RunTaskRecord;
  run_dir: string;
  task_path: string;
  documents_dir: string;
  events_path: string;
}

export interface RunStore {
  startRun(task: RunTaskRecord): Promise<RunHandle>;
}

export interface RunStoreOptions {
  homeDir?: string;
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

async function writeJsonFile(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function createRunStore(options: RunStoreOptions = {}): RunStore {
  const homeDir = options.homeDir ?? os.homedir();
  const runsRoot = path.join(homeDir, ".bill-processing-os", "runs");

  return {
    async startRun(task) {
      const runDir = path.join(
        runsRoot,
        `${sanitizePathPart(task.started_at)}-${sanitizePathPart(task.task_id)}`,
      );
      const documentsDir = path.join(runDir, "documents");
      const taskPath = path.join(runDir, "task.json");
      const eventsPath = path.join(runDir, "events.jsonl");

      await mkdir(documentsDir, { recursive: true });
      await writeJsonFile(taskPath, {
        ...task,
        run_dir: runDir,
      });
      await writeFile(eventsPath, "", "utf8");

      return {
        task,
        run_dir: runDir,
        task_path: taskPath,
        documents_dir: documentsDir,
        events_path: eventsPath,
      };
    },
  };
}
