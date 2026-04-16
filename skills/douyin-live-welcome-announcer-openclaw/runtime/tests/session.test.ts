import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { createSessionRecorder } from "../src/session.js";

describe("createSessionRecorder", () => {
  let rootDir: string | undefined;

  afterEach(async () => {
    if (rootDir) {
      await rm(rootDir, { recursive: true, force: true });
      rootDir = undefined;
    }
  });

  test("writes session metadata and raw events", async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), "douyin-live-session-"));
    const recorder = await createSessionRecorder({
      roomUrl: "https://live.douyin.com/812195156626",
      rootDir,
      startedAt: "2026-04-15T10:00:00.000Z"
    });

    await recorder.record({
      kind: "comment",
      nickname: "阿秋",
      comment: "怎么买课程",
      rawText: "阿秋：怎么买课程",
      detectedAt: "2026-04-15T10:00:05.000Z",
      pageUrl: "https://live.douyin.com/812195156626",
      source: "dom"
    });

    const summary = await recorder.finalize({
      endedAt: "2026-04-15T10:30:00.000Z",
      counts: {
        join: 0,
        gift: 0,
        comment: 1
      }
    });

    const sessionJson = JSON.parse(await readFile(path.join(recorder.sessionDir, "session.json"), "utf8"));
    const eventsJsonl = await readFile(path.join(recorder.sessionDir, "events.jsonl"), "utf8");

    expect(summary.roomId).toBe("812195156626");
    expect(sessionJson.counts.comment).toBe(1);
    expect(eventsJsonl).toContain("\"kind\":\"comment\"");
    expect(eventsJsonl).toContain("怎么买课程");
  });
});
