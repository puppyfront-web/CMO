import os from "node:os";
import path from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright";

import { extractNicknameFromText } from "./nickname.js";
import { buildObserverScript } from "./observer-script.js";

export interface WatcherEntry {
  nickname: string;
  rawText: string;
  detectedAt: string;
  pageUrl: string;
}

export interface StartWatcherOptions {
  url: string;
  userDataDir?: string;
  headless?: boolean;
  logger?: (message: string) => void;
  onCandidateTexts?: (texts: string[]) => void;
  onEntry: (entry: WatcherEntry) => void | Promise<void>;
}

export interface WatcherHandle {
  context: BrowserContext;
  page: Page;
  stop: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
}

const BINDING_NAME = "__douyinLiveWelcomeEmit";

function defaultUserDataDir(): string {
  return path.join(os.homedir(), ".douyin-live-welcome", "browser-profile");
}

export async function startWatcher(options: StartWatcherOptions): Promise<WatcherHandle> {
  let paused = false;
  const logger = options.logger ?? (() => {});
  const userDataDir = options.userDataDir ?? defaultUserDataDir();
  const observerScript = buildObserverScript(BINDING_NAME);

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

      const nickname = extractNicknameFromText(rawText);
      if (!nickname) {
        continue;
      }

      await options.onEntry({
        nickname,
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
  });

  await page.goto(options.url, {
    waitUntil: "domcontentloaded"
  });

  await installObserver(page, observerScript);
  await waitForObserverReady(page);

  page.on("domcontentloaded", () => {
    void installObserver(page, observerScript)
      .then(() => waitForObserverReady(page))
      .catch(() => {});
  });

  return {
    context,
    page,
    stop: async () => {
      await context.close();
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
