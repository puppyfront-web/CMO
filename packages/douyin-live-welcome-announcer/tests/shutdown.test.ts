import { describe, expect, test } from "vitest";

import type { LeadAnalysisResult } from "../src/lead-analysis.js";
import { finalizeWatcherSession } from "../src/shutdown.js";
import type { SessionCounts, SessionRecorder, SessionSummary } from "../src/session.js";

describe("finalizeWatcherSession", () => {
  test("stops the watcher before finalizing and analyzing the session", async () => {
    const steps: string[] = [];
    let contextClosed = false;
    const counts: SessionCounts = {
      join: 1,
      gift: 2,
      comment: 3
    };
    const sessionSummary: SessionSummary = {
      roomUrl: "https://live.douyin.com/812195156626",
      roomId: "812195156626",
      startedAt: "2026-04-16T10:00:00.000Z",
      endedAt: "2026-04-16T10:30:00.000Z",
      sessionDir: "/tmp/session",
      counts
    };
    const recorder: SessionRecorder = {
      sessionDir: sessionSummary.sessionDir,
      async record() {
        throw new Error("not used");
      },
      async finalize({ counts: finalizeCounts }) {
        steps.push("finalize");
        expect(finalizeCounts).toEqual(counts);
        return sessionSummary;
      }
    };
    const analysis: LeadAnalysisResult = {
      roomUrl: sessionSummary.roomUrl,
      startedAt: sessionSummary.startedAt,
      endedAt: sessionSummary.endedAt,
      users: [],
      leads: []
    };

    await finalizeWatcherSession({
      watcher: {
        context: { isClosed: () => contextClosed },
        async stop() {
          steps.push("stop");
          contextClosed = true;
        }
      },
      speaker: {
        stop() {
          steps.push("speaker.stop");
        },
        async waitForIdle() {
          steps.push("speaker.wait");
        }
      },
      sessionRecorder: recorder,
      counts,
      analyze: async ({ summary, context }) => {
        steps.push(`analyze:${context ? "open" : "closed"}`);
        expect(summary).toEqual(sessionSummary);
        return analysis;
      },
      writeAnalysis: async ({ summary, analysis: writtenAnalysis }) => {
        steps.push("write");
        expect(summary).toEqual(sessionSummary);
        expect(writtenAnalysis).toEqual(analysis);
      },
      log: () => {}
    });

    expect(steps).toEqual(["speaker.stop", "stop", "finalize", "analyze:closed", "write", "speaker.wait"]);
  });
});
