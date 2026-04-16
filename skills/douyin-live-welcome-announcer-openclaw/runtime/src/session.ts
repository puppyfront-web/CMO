import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { WatcherEntry } from "./watcher.js";

export interface SessionCounts {
  join: number;
  gift: number;
  comment: number;
}

export interface SessionSummary {
  roomUrl: string;
  roomId: string | null;
  startedAt: string;
  endedAt: string;
  sessionDir: string;
  counts: SessionCounts;
}

export interface CreateSessionRecorderOptions {
  roomUrl: string;
  rootDir?: string;
  startedAt?: string;
}

export interface FinalizeSessionOptions {
  endedAt?: string;
  counts: SessionCounts;
}

export interface SessionRecorder {
  readonly sessionDir: string;
  record(entry: WatcherEntry): Promise<void>;
  finalize(options: FinalizeSessionOptions): Promise<SessionSummary>;
}

export function defaultSessionRoot(): string {
  return path.join(os.homedir(), ".douyin-live-welcome", "sessions");
}

export async function createSessionRecorder(options: CreateSessionRecorderOptions): Promise<SessionRecorder> {
  const startedAt = options.startedAt ?? new Date().toISOString();
  const roomId = extractRoomId(options.roomUrl);
  const sessionDir = path.join(options.rootDir ?? defaultSessionRoot(), buildSessionDirName(startedAt, roomId));

  await mkdir(sessionDir, { recursive: true });

  const sessionBase = {
    roomUrl: options.roomUrl,
    roomId,
    startedAt
  };

  await writeFile(
    path.join(sessionDir, "session.json"),
    JSON.stringify(
      {
        ...sessionBase,
        endedAt: null,
        counts: {
          join: 0,
          gift: 0,
          comment: 0
        }
      },
      null,
      2
    )
  );

  return {
    sessionDir,
    async record(entry: WatcherEntry): Promise<void> {
      const handle = await open(path.join(sessionDir, "events.jsonl"), "a");
      try {
        await handle.appendFile(`${JSON.stringify(entry)}\n`);
      } finally {
        await handle.close();
      }
    },
    async finalize(finalizeOptions: FinalizeSessionOptions): Promise<SessionSummary> {
      const endedAt = finalizeOptions.endedAt ?? new Date().toISOString();
      const summary: SessionSummary = {
        ...sessionBase,
        endedAt,
        sessionDir,
        counts: finalizeOptions.counts
      };

      await writeFile(
        path.join(sessionDir, "session.json"),
        JSON.stringify(
          {
            roomUrl: summary.roomUrl,
            roomId: summary.roomId,
            startedAt: summary.startedAt,
            endedAt: summary.endedAt,
            counts: summary.counts
          },
          null,
          2
        )
      );

      return summary;
    }
  };
}

export async function readSessionEvents(sessionDir: string): Promise<WatcherEntry[]> {
  const filePath = path.join(sessionDir, "events.jsonl");
  const content = await readFile(filePath, "utf8").catch(() => "");
  return content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as WatcherEntry);
}

function buildSessionDirName(startedAt: string, roomId: string | null): string {
  const timestamp = startedAt.replace(/[:.]/gu, "-");
  return roomId ? `${timestamp}-${roomId}` : `${timestamp}-session`;
}

function extractRoomId(roomUrl: string): string | null {
  try {
    const url = new URL(roomUrl);
    const match = url.pathname.match(/(\d+)/u);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
