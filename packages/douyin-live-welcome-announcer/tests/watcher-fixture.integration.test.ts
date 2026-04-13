import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import { startWatcher, type WatcherHandle } from "../src/watcher.js";

describe("fixture watcher", () => {
  let handle: WatcherHandle | undefined;
  let userDataDir: string | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.stop();
      handle = undefined;
    }

    if (userDataDir) {
      await rm(userDataDir, { recursive: true, force: true });
      userDataDir = undefined;
    }
  });

  test("captures new entry messages from DOM mutations", async () => {
    const fixtureUrl = pathToFileURL(path.resolve("tests/fixtures/live-room.html")).toString();
    userDataDir = await mkdtemp(path.join(os.tmpdir(), "douyin-live-welcome-test-"));
    let resolveEntry!: (nickname: string) => void;
    const entryPromise = new Promise<string>((resolve) => {
      resolveEntry = resolve;
    });

    handle = await startWatcher({
      url: fixtureUrl,
      headless: true,
      userDataDir,
      logger: console.log,
      onEntry: (entry) => {
        resolveEntry(entry.nickname);
      }
    });

    await handle.page.evaluate(() => {
      (window as typeof window & { appendEntryMessage: (text: string) => void }).appendEntryMessage(
        "阿秋 进入了直播间"
      );
    });

    await expect(entryPromise).resolves.toBe("阿秋");
  }, 15_000);
});
