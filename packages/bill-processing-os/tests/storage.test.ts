import { mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDocumentStore } from "../src/storage/document-store.js";
import { createEventLog } from "../src/storage/event-log.js";
import { createRunStore } from "../src/storage/run-store.js";
import { createStructuredLogger } from "../src/storage/logger.js";

async function makeHomeDir() {
  return mkdtemp(path.join(os.tmpdir(), "bill-processing-os-home-"));
}

describe("storage contracts", () => {
  it("creates a run directory under ~/.bill-processing-os/runs and writes task.json", async () => {
    const homeDir = await makeHomeDir();
    const runStore = createRunStore({ homeDir });

    const run = await runStore.startRun({
      task_id: "task-001",
      started_at: "2026-04-16T10:11:12.123Z",
      execution_mode: "new_entry",
      user_intent: "process this invoice",
      file_urls: ["file:///tmp/invoice.png"],
      doc_ids: ["doc-001"],
      context: {
        target_excel: {
          workbook_path: "/workbooks/bills.xlsx",
          sheet: "January",
          start_row: 4,
        },
      },
    });

    expect(run.run_dir).toContain(path.join(homeDir, ".bill-processing-os", "runs"));
    expect(run.run_dir).toContain("task-001");

    const taskJson = JSON.parse(await readFile(path.join(run.run_dir, "task.json"), "utf8"));
    expect(taskJson).toMatchObject({
      task_id: "task-001",
      started_at: "2026-04-16T10:11:12.123Z",
      execution_mode: "new_entry",
      doc_ids: ["doc-001"],
    });

    const eventsStat = await stat(path.join(run.run_dir, "events.jsonl"));
    expect(eventsStat.isFile()).toBe(true);
  });

  it("persists document replay artifacts and structured events for batch runs", async () => {
    const homeDir = await makeHomeDir();
    const runStore = createRunStore({ homeDir });
    const run = await runStore.startRun({
      task_id: "task-002",
      started_at: "2026-04-16T10:11:12.123Z",
      execution_mode: "batch_process",
      user_intent: "process a batch of invoices",
      file_urls: ["file:///tmp/invoice-001.png", "file:///tmp/invoice-002.png"],
      doc_ids: ["doc-001", "doc-002"],
      context: {},
    });

    const documentStore = createDocumentStore(run.run_dir);
    const eventLog = createEventLog(run.run_dir);
    const logger = createStructuredLogger(eventLog, "trace-xyz");

    await documentStore.writeDocumentSnapshots("doc-001", {
      raw: {
        markdown: "# invoice 1",
        ocr_text: "invoice 1",
        image_meta: { pages: 1 },
      },
      parsed: {
        fields: { total_amount: "120.00" },
        items: [{ item_name: "Paper", amount: "120.00" }],
      },
      normalized: {
        fields: { total_amount: 120 },
        items: [{ item_name: "Paper", amount: 120 }],
      },
      validation: {
        is_valid: true,
        warnings: [],
        missing_fields: [],
      },
      artifacts: {
        replay: {
          source: "ocr",
          note: "batch run",
        },
      },
    });

    await documentStore.writeDocumentSnapshots("doc-002", {
      raw: {
        markdown: "# invoice 2",
        ocr_text: "invoice 2",
        image_meta: { pages: 2 },
      },
      parsed: {
        fields: { total_amount: "220.00" },
        items: [{ item_name: "Boxes", amount: "220.00" }],
      },
      normalized: {
        fields: { total_amount: 220 },
        items: [{ item_name: "Boxes", amount: 220 }],
      },
      validation: {
        is_valid: true,
        warnings: ["needs confirmation"],
        missing_fields: [],
      },
    });

    await logger.stateTransition("doc-001", "UPLOADED", "PARSED", {
      message: "document parsed",
    });
    await logger.decision("doc-002", "AUTO_WRITE", {
      message: "confidence above threshold",
    });

    const doc1Raw = JSON.parse(
      await readFile(path.join(run.run_dir, "documents", "doc-001", "raw.json"), "utf8"),
    );
    const doc1Artifact = JSON.parse(
      await readFile(
        path.join(run.run_dir, "documents", "doc-001", "artifacts", "replay.json"),
        "utf8",
      ),
    );
    const doc2Validation = JSON.parse(
      await readFile(path.join(run.run_dir, "documents", "doc-002", "validation.json"), "utf8"),
    );

    expect(doc1Raw).toMatchObject({
      markdown: "# invoice 1",
      image_meta: { pages: 1 },
    });
    expect(doc1Artifact).toMatchObject({
      source: "ocr",
      note: "batch run",
    });
    expect(doc2Validation).toMatchObject({
      is_valid: true,
      warnings: ["needs confirmation"],
    });

    const events = (await readFile(path.join(run.run_dir, "events.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      trace_id: "trace-xyz",
      kind: "state_transition",
      document_id: "doc-001",
      from_state: "UPLOADED",
      to_state: "PARSED",
    });
    expect(events[1]).toMatchObject({
      trace_id: "trace-xyz",
      kind: "decision",
      document_id: "doc-002",
      decision: "AUTO_WRITE",
    });
  });
});
