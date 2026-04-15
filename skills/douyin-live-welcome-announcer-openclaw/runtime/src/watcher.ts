import os from "node:os";
import path from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright";

import { extractGiftEventFromText, extractNicknameFromText } from "./nickname.js";
import { buildObserverScript } from "./observer-script.js";
import { extractGiftEventFromWebcastFrame, isDouyinWebcastPushSocketUrl } from "./webcast.js";

export type WatcherEventKind = "join" | "gift";

export interface WatcherEntry {
  kind: WatcherEventKind;
  nickname: string;
  gift?: string;
  rawText: string;
  detectedAt: string;
  pageUrl: string;
}

export interface StartWatcherOptions {
  url: string;
  launchUrl?: string;
  userDataDir?: string;
  headless?: boolean;
  logger?: (message: string) => void;
  onCandidateTexts?: (texts: string[]) => void;
  onEntry: (entry: WatcherEntry) => void | Promise<void>;
}

export interface WatcherHandle {
  context: BrowserContext;
  page: Page;
  closed: Promise<void>;
  stop: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
}

const BINDING_NAME = "__douyinLiveWelcomeEmit";

export function isDouyinLiveHomepage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "live.douyin.com" && (parsed.pathname === "/" || parsed.pathname === "");
  } catch {
    return false;
  }
}

export function isSameWatchedPage(currentUrl: string, targetUrl: string): boolean {
  try {
    const current = new URL(currentUrl);
    const target = new URL(targetUrl);
    const currentDouyinRoomId = extractDouyinRoomId(current);
    const targetDouyinRoomId = extractDouyinRoomId(target);

    if (currentDouyinRoomId && targetDouyinRoomId) {
      return currentDouyinRoomId === targetDouyinRoomId;
    }

    const currentPath = current.pathname.replace(/\/+$/u, "") || "/";
    const targetPath = target.pathname.replace(/\/+$/u, "") || "/";

    return current.origin === target.origin && currentPath === targetPath;
  } catch {
    return false;
  }
}

function extractDouyinRoomId(url: URL): string | null {
  const liveHost = url.hostname === "live.douyin.com";
  const followLiveHost = url.hostname === "www.douyin.com";

  if (liveHost) {
    const match = url.pathname.match(/^\/(?<roomId>\d+)\/?$/u);
    return match?.groups?.roomId ?? null;
  }

  if (followLiveHost) {
    const match = url.pathname.match(/^\/follow\/live\/(?<roomId>\d+)\/?$/u);
    return match?.groups?.roomId ?? null;
  }

  return null;
}

export function shouldAutoNavigateToTargetRoom(currentUrl: string, targetUrl: string): boolean {
  try {
    const target = new URL(targetUrl);
    if (target.hostname !== "live.douyin.com") {
      return false;
    }
  } catch {
    return false;
  }

  return isDouyinLiveHomepage(currentUrl) && !isSameWatchedPage(currentUrl, targetUrl);
}

function defaultUserDataDir(): string {
  return path.join(os.homedir(), ".douyin-live-welcome", "browser-profile");
}

export async function startWatcher(options: StartWatcherOptions): Promise<WatcherHandle> {
  let paused = false;
  let autoNavigateTimer: NodeJS.Timeout | undefined;
  let closedResolved = false;
  let resolveClosed!: () => void;
  const logger = options.logger ?? (() => {});
  const userDataDir = options.userDataDir ?? defaultUserDataDir();
  const observerScript = buildObserverScript(BINDING_NAME);
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });

  const markClosed = (): void => {
    if (closedResolved) {
      return;
    }

    closedResolved = true;

    if (autoNavigateTimer) {
      clearInterval(autoNavigateTimer);
      autoNavigateTimer = undefined;
    }

    resolveClosed();
  };

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: options.headless ?? false,
    viewport: null,
    args: ["--disable-blink-features=AutomationControlled"]
  });

  await context.exposeBinding(BINDING_NAME, async (_source, payload: unknown) => {
    if (paused) {
      return;
    }

    const texts = Array.isArray(payload) ? payload : [payload];
    const normalizedTexts = texts
      .map((candidate) => String(candidate ?? "").trim())
      .filter(Boolean);

    if (normalizedTexts.length > 0) {
      options.onCandidateTexts?.(normalizedTexts);
    }

    for (const rawText of normalizedTexts) {
      if (!rawText) {
        continue;
      }

      const giftEvent = extractGiftEventFromText(rawText);
      if (giftEvent) {
        await options.onEntry({
          kind: "gift",
          nickname: giftEvent.nickname,
          gift: giftEvent.gift,
          rawText,
          detectedAt: new Date().toISOString(),
          pageUrl: page.url()
        });
        continue;
      }

      const joinNickname = extractNicknameFromText(rawText);
      if (!joinNickname) {
        continue;
      }

      await options.onEntry({
        kind: "join",
        nickname: joinNickname,
        rawText,
        detectedAt: new Date().toISOString(),
        pageUrl: page.url()
      });
    }
  });

  await context.addInitScript({ content: observerScript });

  const page = context.pages()[0] ?? (await context.newPage());

  page.on("crash", () => {
    logger("监听页面崩溃，请重启程序。");
  });

  page.on("close", () => {
    logger("监听页面已关闭。");
    markClosed();
  });

  context.on("close", () => {
    markClosed();
  });

  page.on("websocket", (websocket) => {
    if (!isDouyinWebcastPushSocketUrl(websocket.url())) {
      return;
    }

    websocket.on("framereceived", ({ payload }) => {
      void (async () => {
        if (paused) {
          return;
        }

        const giftEvent = extractGiftEventFromWebcastFrame(
          Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload))
        );
        if (!giftEvent) {
          return;
        }

        await options.onEntry({
          kind: "gift",
          nickname: giftEvent.nickname,
          gift: giftEvent.gift,
          rawText: giftEvent.summary,
          detectedAt: new Date().toISOString(),
          pageUrl: page.url()
        });
      })().catch((error) => {
        logger(`解析礼物 WebSocket 帧失败：${String(error)}`);
      });
    });
  });

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      logger(`页面已跳转：${page.url()}`);
    }
  });

  await page.goto(options.launchUrl ?? options.url, {
    waitUntil: "domcontentloaded"
  });

  await installObserver(page, observerScript);
  await waitForObserverReady(page);

  page.on("domcontentloaded", () => {
    void installObserver(page, observerScript)
      .then(() => waitForObserverReady(page))
      .catch(() => {});
  });

  if (options.launchUrl && options.launchUrl !== options.url) {
    autoNavigateTimer = setInterval(() => {
      const currentUrl = page.url();
      if (!shouldAutoNavigateToTargetRoom(currentUrl, options.url)) {
        return;
      }

      logger(`检测到仍在首页，正在自动进入指定直播间：${options.url}`);
      void page.goto(options.url, { waitUntil: "domcontentloaded" }).catch(() => {});
    }, 3_000);
  }

  return {
    context,
    page,
    closed,
    stop: async () => {
      markClosed();
      if (!context.isClosed()) {
        await context.close().catch(() => {});
      }
    },
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    isPaused: () => paused
  };
}

async function installObserver(page: Page, observerScript: string): Promise<void> {
  await page.evaluate(observerScript);
}

async function waitForObserverReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return Boolean(
      (window as typeof window & {
        __douyinLiveWelcomeObserverReady?: boolean;
      }).__douyinLiveWelcomeObserverReady
    );
  });
}
