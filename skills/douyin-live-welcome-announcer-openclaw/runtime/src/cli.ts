import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

import { Deduper } from "./dedupe.js";
import { parseCliArgs } from "./config.js";
import { extractNicknameFromText, renderWelcomeMessage } from "./nickname.js";
import { SpeakerQueue } from "./speaker.js";
import { startWatcher } from "./watcher.js";

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

  const watcher = await startWatcher({
    url: config.url,
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
      if (!deduper.shouldAccept(entry.nickname)) {
        log(`忽略重复进场：${entry.nickname}`);
        return;
      }

      const message = renderWelcomeMessage(config.template, entry.nickname);
      log(`欢迎播报：${entry.nickname}`);
      void speaker.speak(message).catch((error) => {
        log(`语音播报失败：${String(error)}`);
      });
    }
  });

  log(`监听页面已打开：${watcher.page.url()}`);
  log("命令：p 暂停，r 恢复，q 退出");

  const teardownInput = attachInputControls(watcher.pause, watcher.resume, watcher.isPaused, log);

  try {
    await waitForSignal();
  } finally {
    teardownInput();
    await watcher.stop();
    await speaker.waitForIdle();
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
        events.push(entry.nickname);
        void speaker.speak(renderWelcomeMessage(config.template, entry.nickname));
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
