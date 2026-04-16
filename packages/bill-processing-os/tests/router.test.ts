import { describe, expect, it } from "vitest";

import { buildTaskContext } from "../src/router/context-builder.js";
import { classifyExecutionMode } from "../src/router/intent-classifier.js";
import { routeBillTask } from "../src/router/bill-task-router.js";

describe("router contracts", () => {
  it("classifies execution mode from user intent and file count", () => {
    expect(
      classifyExecutionMode({
        user_intent: "please repair this run",
        file_count: 1,
      }),
    ).toBe("repair");

    expect(
      classifyExecutionMode({
        user_intent: "review this manually",
        file_count: 1,
      }),
    ).toBe("manual_review");

    expect(
      classifyExecutionMode({
        user_intent: "onboard a new invoice type",
        file_count: 1,
      }),
    ).toBe("type_onboarding");

    expect(
      classifyExecutionMode({
        user_intent: "process these files",
        file_count: 3,
      }),
    ).toBe("batch_process");

    expect(
      classifyExecutionMode({
        user_intent: "new entry for this bill",
        file_count: 1,
      }),
    ).toBe("new_entry");
  });

  it("builds a normalized task context with target excel, templates, and repair metadata", () => {
    const context = buildTaskContext({
      file_url: "file:///tmp/invoice.png",
      user_intent: "repair this invoice",
      context: {
        target_excel: {
          workbook_path: "/workbooks/bills.xlsx",
          sheet: "January",
          start_row: 4,
        },
        templates: [
          { type_id: "fabric_sales_v1", version: 2 },
          "legacy_type",
        ],
        prior_run: {
          task_id: "task-009",
          execution_mode: "new_entry",
          failure_reason: "missing total",
          doc_ids: ["doc-007"],
        },
        doc_ids: ["doc-001", "doc-002"],
      },
    });

    expect(context).toMatchObject({
      execution_mode: "repair",
      file_count: 1,
      doc_ids: ["doc-001", "doc-002"],
      target_excel: {
        workbook_path: "/workbooks/bills.xlsx",
        sheet: "January",
        start_row: 4,
      },
      template_set: [
        { type_id: "fabric_sales_v1", version: 2 },
        { type_id: "legacy_type", version: 1 },
      ],
      prior_run: {
        task_id: "task-009",
        execution_mode: "new_entry",
        failure_reason: "missing total",
        doc_ids: ["doc-007"],
      },
      repair: {
        enabled: true,
        source_task_id: "task-009",
        failure_reason: "missing total",
      },
    });
  });

  it("returns a stable router output contract for downstream pipelines", () => {
    const route = routeBillTask({
      file_url: "file:///tmp/invoice.png",
      user_intent: "process this invoice",
      context: {
        task_id: "task-001",
        doc_ids: ["doc-001"],
        target_excel: {
          workbook_path: "/workbooks/bills.xlsx",
          sheet: "January",
        },
      },
    });

    expect(route).toMatchObject({
      intent: "new_entry",
      type_match: 0.82,
      action: "parse_and_confirm",
      task_id: "task-001",
      doc_ids: ["doc-001"],
      task_context: {
        execution_mode: "new_entry",
        file_count: 1,
      },
    });
  });
});
