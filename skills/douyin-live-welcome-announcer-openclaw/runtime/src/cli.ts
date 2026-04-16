import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

import { Deduper } from "./dedupe.js";
import { parseCliArgs } from "./config.js";
import { analyzeLeadSession, writeLeadAnalysis } from "./lead-analysis.js";
import { extractNicknameFromText, renderGiftAnnouncement, renderWelcomeMessage } from "./nickname.js";
import { createSessionRecorder, readSessionEvents } from "./session.js";
import { finalizeWatcherSession } from "./shutdown.js";
import { SpeakerQueue } from "./speaker.js";
import { isDouyinLiveHomepage, isSameWatchedPage, startWatcher } from "./watcher.js";

async function main(): Promise<void> {
  const config = parseCliArgs(process.argv.slice(2));
  const log = createLogger();

  if (config.command === "smoke-fixture") {
    await runSmokeFixture(config);
    return;
  }

  const speaker = new SpeakerQueue({
    dryRun: config.dryRun,
    engine: config.speakerEngine,
    sayVoice: config.sayVoice,
    edgeVoice: config.edgeVoice,
    edgeRate: config.edgeRate,
    edgePitch: config.edgePitch,
    edgeVolume: config.edgeVolume,
    logger: log
  });
  const deduper = new Deduper(config.dedupeMs);
  let warnedHomepage = false;
  let warnedWrongRoom = false;
  const startedAt = new Date().toISOString();
  const sessionRecorder = await createSessionRecorder({
    roomUrl: config.url,
    startedAt
  });
  const counts = {
    join: 0,
    gift: 0,
    comment: 0
  };

  const watcher = await startWatcher({
    url: config.url,
    launchUrl: config.launchUrl,
    userDataDir: config.userDataDir,
    headless: config.headless,
    logger: log,
    onCandidateTexts: config.debugCandidates
      ? (texts) => {
          for (const text of texts.slice(0, 5)) {
            log(`候选文本：${text}`);
          }
        }
      : undefined,
    onEntry: async (entry) => {
      if (!isSameWatchedPage(entry.pageUrl, config.url)) {
        if (!warnedWrongRoom) {
          warnedWrongRoom = true;
          log(`当前页面已偏离指定直播间：${config.url}`);
        }
        return;
      }

      warnedWrongRoom = false;

      if (isDouyinLiveHomepage(entry.pageUrl)) {
        if (!warnedHomepage) {
          warnedHomepage = true;
          log("当前仍在 live.douyin.com 首页，请切到你自己的真实直播间页面。");
        }
        return;
      }

      warnedHomepage = false;

      counts[entry.kind] += 1;
      await sessionRecorder.record(entry);

      if (entry.kind !== "gift") {
        return;
      }

      const dedupeKey = `${entry.nickname}::${entry.gift ?? "礼物"}`;
      if (!deduper.shouldAccept(dedupeKey)) {
        log(`忽略重复礼物播报：${entry.nickname} ${entry.gift ?? "礼物"}`);
        return;
      }

      const message = renderGiftAnnouncement(config.template, entry.nickname, entry.gift, entry.rawText);
      log(`礼物播报：${entry.nickname} ${entry.gift ?? "礼物"}`);
      void speaker.speak(message).catch((error) => {
        log(`语音播报失败：${String(error)}`);
      });
    }
  });

  log(`监听页面已打开：${watcher.page.url()}`);
  log(`指定直播间：${config.url}`);
  if (config.launchUrl !== config.url) {
    log("已先打开抖音直播首页，请先登录，再在当前窗口进入指定直播间。");
  }
  if (!isSameWatchedPage(watcher.page.url(), config.url)) {
    log(`当前页面还没进入指定直播间：${config.url}`);
  }
  if (isDouyinLiveHomepage(watcher.page.url())) {
    log("当前仍在 live.douyin.com 首页，请切到你自己的真实直播间页面。");
  }
  log("命令：p 暂停，r 恢复，q 退出");
  log(`本场直播会话目录：${sessionRecorder.sessionDir}`);

  const teardownInput = attachInputControls(watcher.pause, watcher.resume, watcher.isPaused, log);

  try {
    await Promise.race([waitForSignal(), watcher.closed]);
  } finally {
    teardownInput();
    await finalizeWatcherSession({
      watcher,
      speaker,
      sessionRecorder,
      counts,
      analyze: async ({ summary, context }) =>
        analyzeLeadSession({
          roomUrl: summary.roomUrl,
          startedAt: summary.startedAt,
          endedAt: summary.endedAt,
          events: await readSessionEvents(summary.sessionDir),
          context,
          logger: log
        }),
      writeAnalysis: async ({ summary, analysis }) => {
        await writeLeadAnalysis(summary.sessionDir, analysis);
      },
      log
    });
  }
}

async function runSmokeFixture(config: ReturnType<typeof parseCliArgs>): Promise<void> {
  const log = createLogger();
  const speaker = new SpeakerQueue({
    dryRun: true,
    engine: config.speakerEngine,
    sayVoice: config.sayVoice,
    edgeVoice: config.edgeVoice,
    edgeRate: config.edgeRate,
    edgePitch: config.edgePitch,
    edgeVolume: config.edgeVolume,
    logger: log
  });
  const events: string[] = [];
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "douyin-live-welcome-smoke-"));

  try {
    const watcher = await startWatcher({
      url: config.url,
      userDataDir,
      headless: true,
      logger: log,
      onEntry: async (entry) => {
        if (entry.kind === "join") {
          events.push(entry.nickname);
          void speaker.speak(renderWelcomeMessage(config.template, entry.nickname));
        }
      }
    });

    await watcher.page.evaluate(() => {
      (window as typeof window & { appendEntryMessage: (text: string) => void }).appendEntryMessage(
        "测试观众 进入了直播间"
      );
    });

    await waitFor(() => events.length > 0, 5_000);

    const nickname = extractNicknameFromText("测试观众 进入了直播间");
    log(`fixture 捕获成功：${nickname}`);
    await speaker.waitForIdle();
    await watcher.stop();
  } finally {
    await rm(userDataDir, { recursive: true, force: true });
  }
}

function attachInputControls(
  pause: () => void,
  resume: () => void,
  isPaused: () => boolean,
  log: (message: string) => void
): () => void {
  if (!process.stdin.isTTY) {
    return () => {};
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("line", (line) => {
    const command = line.trim().toLowerCase();

    if (command === "p") {
      pause();
      log("已暂停欢迎播报。");
      return;
    }

    if (command === "r") {
      resume();
      log("已恢复欢迎播报。");
      return;
    }

    if (command === "q") {
      process.kill(process.pid, "SIGINT");
      return;
    }

    if (command === "s") {
      log(isPaused() ? "当前状态：暂停" : "当前状态：运行中");
      return;
    }

    log("未知命令，可用命令：p / r / s / q");
  });

  return () => {
    rl.close();
  };
}

function waitForSignal(): Promise<void> {
  return new Promise((resolve) => {
    const handleSignal = () => {
      process.off("SIGINT", handleSignal);
      process.off("SIGTERM", handleSignal);
      resolve();
    };

    process.on("SIGINT", handleSignal);
    process.on("SIGTERM", handleSignal);
  });
}

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms`);
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function createLogger(): (message: string) => void {
  return (message: string) => {
    const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    console.log(`[${timestamp}] ${message}`);
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
