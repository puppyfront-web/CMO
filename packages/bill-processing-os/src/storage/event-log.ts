import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";

export interface StorageEventRecord {
  trace_id: string;
  kind: string;
  message: string;
  timestamp: string;
  document_id?: string;
  from_state?: string;
  to_state?: string;
  decision?: string;
  details?: Record<string, unknown>;
}

export interface EventLog {
  append(event: Omit<StorageEventRecord, "timestamp"> & Partial<Pick<StorageEventRecord, "timestamp">>): Promise<void>;
  readAll(): Promise<StorageEventRecord[]>;
  path: string;
}

export function createEventLog(runDir: string): EventLog {
  const filePath = path.join(runDir, "events.jsonl");

  return {
    path: filePath,
    async append(event) {
      const record: StorageEventRecord = {
        ...event,
        timestamp: event.timestamp ?? new Date().toISOString(),
      };
      await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
    },
    async readAll() {
      const contents = await readFile(filePath, "utf8");
      return contents
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as StorageEventRecord);
    },
  };
}
