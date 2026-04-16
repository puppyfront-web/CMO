import os from "node:os";
import path from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright";

import { extractCommentEventFromText, extractGiftEventFromText, extractNicknameFromText } from "./nickname.js";
import { buildObserverScript } from "./observer-script.js";
import { extractCommentEventFromWebcastFrame, extractGiftEventFromWebcastFrame, isDouyinWebcastPushSocketUrl } from "./webcast.js";

export type WatcherEventKind = "join" | "gift" | "comment";

export interface WatcherEntry {
  kind: WatcherEventKind;
  nickname: string;
  gift?: string;
  comment?: string;
  profileUrl?: string;
  source?: "websocket" | "dom";
  rawText: string;
  detectedAt: string;
  pageUrl: string;
}

interface ObserverCandidate {
  text: string;
  hrefs?: string[];
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
  readonly page: Page;
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

export function findExistingWatchedPage<T extends { url(): string }>(pages: T[], targetUrl: string): T | undefined {
  return pages.find((page) => isSameWatchedPage(page.url(), targetUrl));
}

function shouldHandlePageEvent(pageUrl: string, targetUrl: string): boolean {
  return isSameWatchedPage(pageUrl, targetUrl) && !isDouyinLiveHomepage(pageUrl);
}

function defaultUserDataDir(): string {
  return path.join(os.homedir(), ".douyin-live-welcome", "browser-profile");
}

export async function startWatcher(options: StartWatcherOptions): Promise<WatcherHandle> {
  let paused = false;
  let activePage!: Page;
  let autoNavigateTimer: NodeJS.Timeout | undefined;
  let pendingCloseTimer: NodeJS.Timeout | undefined;
  let closedResolved = false;
  let resolveClosed!: () => void;
  const logger = options.logger ?? (() => {});
  const userDataDir = options.userDataDir ?? defaultUserDataDir();
  const observerScript = buildObserverScript(BINDING_NAME);
  const registeredPages = new WeakSet<Page>();
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });

  const clearPendingCloseTimer = (): void => {
    if (pendingCloseTimer) {
      clearTimeout(pendingCloseTimer);
      pendingCloseTimer = undefined;
    }
  };

  const markClosed = (): void => {
    if (closedResolved) {
      return;
    }

    closedResolved = true;
    clearPendingCloseTimer();

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

  const findReplacementPage = (): Page | undefined => {
    return findExistingWatchedPage(
      context.pages().filter((page) => !page.isClosed()),
      options.url
    );
  };

  const activatePage = (page: Page, reason?: string): void => {
    clearPendingCloseTimer();
    if (activePage === page) {
      return;
    }

    activePage = page;
    if (reason) {
      logger(reason);
    }
  };

  const scheduleCloseAfterPageClose = (): void => {
    clearPendingCloseTimer();
    pendingCloseTimer = setTimeout(() => {
      const replacementPage = findReplacementPage();
      if (replacementPage) {
        activatePage(replacementPage, `检测到直播页已切换：${replacementPage.url()}`);
        return;
      }

      logger("监听页面已关闭。");
      markClosed();
    }, 750);
  };

  const ensureObserverInstalled = async (page: Page): Promise<void> => {
    await installObserver(page, observerScript);
    await waitForObserverReady(page);
  };

  const registerPage = (page: Page): void => {
    if (registeredPages.has(page)) {
      return;
    }

    registeredPages.add(page);

    page.on("crash", () => {
      if (page === activePage) {
        logger("监听页面崩溃，请重启程序。");
      }
    });

    page.on("close", () => {
      if (page === activePage) {
        scheduleCloseAfterPageClose();
      }
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

          if (!shouldHandlePageEvent(page.url(), options.url)) {
            return;
          }

          const giftEvent = extractGiftEventFromWebcastFrame(
            Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload))
          );
          if (!giftEvent) {
            const commentEvent = extractCommentEventFromWebcastFrame(
              Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload))
            );
            if (!commentEvent) {
              return;
            }

            await options.onEntry({
              kind: "comment",
              nickname: commentEvent.nickname,
              comment: commentEvent.comment,
              rawText: commentEvent.summary,
              detectedAt: new Date().toISOString(),
              pageUrl: page.url(),
              source: "websocket"
            });
            return;
          }

          await options.onEntry({
            kind: "gift",
            nickname: giftEvent.nickname,
            gift: giftEvent.gift,
            rawText: giftEvent.summary,
            detectedAt: new Date().toISOString(),
            pageUrl: page.url(),
            source: "websocket"
          });
        })().catch((error) => {
          logger(`解析礼物 WebSocket 帧失败：${String(error)}`);
        });
      });
    });

    page.on("framenavigated", (frame) => {
      if (frame !== page.mainFrame()) {
        return;
      }

      if (page === activePage || isSameWatchedPage(page.url(), options.url)) {
        logger(`页面已跳转：${page.url()}`);
      }

      if (isSameWatchedPage(page.url(), options.url) && page !== activePage) {
        activatePage(page, `检测到直播页已切换：${page.url()}`);
      }
    });

    page.on("domcontentloaded", () => {
      void ensureObserverInstalled(page).catch(() => {});
    });
  };

  await context.exposeBinding(BINDING_NAME, async (source, payload: unknown) => {
    if (paused) {
      return;
    }

    const sourcePage = source.page ?? activePage;
    const sourcePageUrl = sourcePage?.url() ?? activePage.url();
    if (!shouldHandlePageEvent(sourcePageUrl, options.url)) {
      return;
    }

    const candidates = normalizeObserverCandidates(payload);
    const normalizedTexts = candidates.map((candidate) => candidate.text);

    if (normalizedTexts.length > 0) {
      options.onCandidateTexts?.(normalizedTexts);
    }

    for (const candidate of candidates) {
      const rawText = candidate.text;
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
          pageUrl: sourcePageUrl,
          source: "dom"
        });
        continue;
      }

      const commentEvent = extractCommentEventFromText(rawText);
      if (commentEvent) {
        await options.onEntry({
          kind: "comment",
          nickname: commentEvent.nickname,
          comment: commentEvent.comment,
          profileUrl: resolveProfileUrl(candidate.hrefs, sourcePageUrl),
          rawText,
          detectedAt: new Date().toISOString(),
          pageUrl: sourcePageUrl,
          source: "dom"
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
        pageUrl: sourcePageUrl,
        source: "dom"
      });
    }
  });

  await context.addInitScript({ content: observerScript });
  context.on("page", registerPage);

  context.on("close", () => {
    markClosed();
  });

  for (const page of context.pages()) {
    registerPage(page);
  }

  const existingWatchedPage = findExistingWatchedPage(context.pages(), options.url);
  activePage = existingWatchedPage ?? (await context.newPage());
  registerPage(activePage);

  if (existingWatchedPage) {
    await ensureObserverInstalled(activePage);
  } else {
    await activePage.goto(options.launchUrl ?? options.url, {
      waitUntil: "domcontentloaded"
    });
    await ensureObserverInstalled(activePage);
  }

  if (options.launchUrl && options.launchUrl !== options.url) {
    autoNavigateTimer = setInterval(() => {
      const currentUrl = activePage.url();
      if (!shouldAutoNavigateToTargetRoom(currentUrl, options.url)) {
        return;
      }

      logger(`检测到仍在首页，正在自动进入指定直播间：${options.url}`);
      void activePage.goto(options.url, { waitUntil: "domcontentloaded" }).catch(() => {});
    }, 3_000);
  }

  return {
    context,
    get page() {
      return activePage;
    },
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

function normalizeObserverCandidates(payload: unknown): ObserverCandidate[] {
  const items = Array.isArray(payload) ? payload : [payload];

  return items
    .map((item) => {
      if (item && typeof item === "object" && "text" in item) {
        const candidate = item as { text?: unknown; hrefs?: unknown };
        return {
          text: String(candidate.text ?? "").trim(),
          hrefs: Array.isArray(candidate.hrefs)
            ? candidate.hrefs.map((href) => String(href ?? "").trim()).filter(Boolean)
            : []
        };
      }

      return {
        text: String(item ?? "").trim(),
        hrefs: []
      };
    })
    .filter((candidate) => Boolean(candidate.text));
}

function resolveProfileUrl(hrefs: string[] | undefined, pageUrl: string): string | undefined {
  for (const href of hrefs ?? []) {
    try {
      const normalized = new URL(href, pageUrl).href;
      if (/douyin\.com\/user\//u.test(normalized)) {
        return normalized;
      }
    } catch {
      continue;
    }
  }

  return undefined;
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
