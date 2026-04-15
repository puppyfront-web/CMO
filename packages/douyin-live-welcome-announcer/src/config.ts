import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type CommandName = "watch" | "smoke-fixture";
export type SpeakerEngine = "auto" | "say" | "edge";

export interface RuntimeConfig {
  command: CommandName;
  url: string;
  launchUrl: string;
  userDataDir: string;
  speakerEngine: SpeakerEngine;
  sayVoice: string;
  edgeVoice: string;
  edgeRate: string;
  edgePitch: string;
  edgeVolume: string;
  template: string;
  dedupeMs: number;
  headless: boolean;
  dryRun: boolean;
  debugCandidates: boolean;
}

const DEFAULT_TEMPLATE = "感谢{nickname}送的{gift}，比心";

function resolveLaunchUrl(command: CommandName, targetUrl: string): string {
  if (command !== "watch") {
    return targetUrl;
  }

  try {
    const parsed = new URL(targetUrl);
    if (parsed.hostname === "live.douyin.com") {
      return "https://live.douyin.com/";
    }
  } catch {
    return targetUrl;
  }

  return targetUrl;
}

export function parseCliArgs(argv: string[]): RuntimeConfig {
  const [firstArg, ...restArgs] = argv;
  const hasExplicitCommand = firstArg === "watch" || firstArg === "smoke-fixture";
  const command: CommandName = hasExplicitCommand ? firstArg : "watch";
  const flags = hasExplicitCommand ? restArgs : argv;

  const values = parseFlags(flags);
  const stateRoot = path.join(os.homedir(), ".douyin-live-welcome");
  const url =
    values.url ??
    (command === "smoke-fixture" ? pathToFileURL(path.resolve("tests/fixtures/live-room.html")).toString() : undefined);

  if (command === "watch" && !url) {
    throw new Error("watch 模式必须提供 --url 直播间链接");
  }

  return {
    command,
    url: url!,
    launchUrl: resolveLaunchUrl(command, url!),
    userDataDir: values["user-data-dir"] ?? path.join(stateRoot, "browser-profile"),
    speakerEngine: parseSpeakerEngine(values.engine),
    sayVoice: values["say-voice"] ?? "Tingting",
    edgeVoice: values["edge-voice"] ?? "zh-CN-XiaoxiaoNeural",
    edgeRate: values["edge-rate"] ?? "+10%",
    edgePitch: values["edge-pitch"] ?? "+0Hz",
    edgeVolume: values["edge-volume"] ?? "+0%",
    template: values.template ?? DEFAULT_TEMPLATE,
    dedupeMs: Number(values["dedupe-ms"] ?? 15_000),
    headless: parseBoolean(values.headless, command === "smoke-fixture"),
    dryRun: parseBoolean(values["dry-run"], command === "smoke-fixture"),
    debugCandidates: parseBoolean(values["debug-candidates"], false)
  };
}

function parseFlags(args: string[]): Record<string, string | undefined> {
  const values: Record<string, string | undefined> = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const nextToken = args[index + 1];

    if (!nextToken || nextToken.startsWith("--")) {
      values[key] = "true";
      continue;
    }

    values[key] = nextToken;
    index += 1;
  }

  return values;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value !== "false";
}

function parseSpeakerEngine(value: string | undefined): SpeakerEngine {
  if (value === "say" || value === "edge") {
    return value;
  }

  return "auto";
}
