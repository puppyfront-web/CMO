import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import {
  isDouyinLiveHomepage,
  isSameWatchedPage,
  shouldAutoNavigateToTargetRoom,
  startWatcher,
  type WatcherHandle
} from "../src/watcher.js";

describe("isDouyinLiveHomepage", () => {
  test("detects the root homepage only", () => {
    expect(isDouyinLiveHomepage("https://live.douyin.com/")).toBe(true);
    expect(isDouyinLiveHomepage("https://live.douyin.com")).toBe(true);
    expect(isDouyinLiveHomepage("https://live.douyin.com/123456")).toBe(false);
    expect(isDouyinLiveHomepage("not-a-url")).toBe(false);
  });
});

describe("isSameWatchedPage", () => {
  test("matches the same room while ignoring query strings", () => {
    expect(isSameWatchedPage("https://live.douyin.com/123456?foo=1", "https://live.douyin.com/123456")).toBe(true);
    expect(isSameWatchedPage("https://live.douyin.com/123456", "https://live.douyin.com/654321")).toBe(false);
    expect(isSameWatchedPage("file:///tmp/a.html?foo=1", "file:///tmp/a.html")).toBe(true);
  });

  test("matches equivalent douyin live room urls across hosts", () => {
    expect(
      isSameWatchedPage("https://live.douyin.com/616322502482", "https://www.douyin.com/follow/live/616322502482")
    ).toBe(true);
  });
});

describe("shouldAutoNavigateToTargetRoom", () => {
  test("navigates from douyin homepage to the target room", () => {
    expect(shouldAutoNavigateToTargetRoom("https://live.douyin.com/", "https://live.douyin.com/78348370505")).toBe(
      true
    );
  });

  test("does not navigate when already inside the target room", () => {
    expect(
      shouldAutoNavigateToTargetRoom(
        "https://live.douyin.com/78348370505?foo=1",
        "https://live.douyin.com/78348370505"
      )
    ).toBe(false);
  });

  test("does not navigate for non-douyin targets", () => {
    expect(shouldAutoNavigateToTargetRoom("https://example.com/", "https://example.com/live")).toBe(false);
  });
});

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

  test("captures gift messages from DOM mutations as a fallback path", async () => {
    const fixtureUrl = pathToFileURL(path.resolve("tests/fixtures/live-room.html")).toString();
    userDataDir = await mkdtemp(path.join(os.tmpdir(), "douyin-live-welcome-test-"));
    let resolveGift!: (entry: { nickname: string; gift?: string; kind: string }) => void;
    const giftPromise = new Promise<{ nickname: string; gift?: string; kind: string }>((resolve) => {
      resolveGift = resolve;
    });

    handle = await startWatcher({
      url: fixtureUrl,
      headless: true,
      userDataDir,
      logger: console.log,
      onEntry: (entry) => {
        if (entry.kind === "gift") {
          resolveGift(entry);
        }
      }
    });

    await handle.page.evaluate(() => {
      (window as typeof window & { appendEntryMessage: (text: string) => void }).appendEntryMessage("阿秋 送出了 小心心");
    });

    await expect(giftPromise).resolves.toMatchObject({
      kind: "gift",
      nickname: "阿秋",
      gift: "小心心"
    });
  }, 15_000);

  test("resolves the closed signal when the watched page is closed", async () => {
    const fixtureUrl = pathToFileURL(path.resolve("tests/fixtures/live-room.html")).toString();
    userDataDir = await mkdtemp(path.join(os.tmpdir(), "douyin-live-welcome-test-"));

    handle = await startWatcher({
      url: fixtureUrl,
      headless: true,
      userDataDir,
      logger: console.log,
      onEntry: () => {}
    });

    const closedPromise = handle.closed;
    await handle.page.close();

    await expect(closedPromise).resolves.toBeUndefined();
  }, 15_000);
});
