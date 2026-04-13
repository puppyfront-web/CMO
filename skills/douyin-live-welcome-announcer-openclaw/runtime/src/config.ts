import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type CommandName = "watch" | "smoke-fixture";
export type SpeakerEngine = "auto" | "say" | "edge";

export interface RuntimeConfig {
  command: CommandName;
  url: string;
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

const DEFAULT_TEMPLATE = "欢迎 {nickname} 来到直播间";

export function parseCliArgs(argv: string[]): RuntimeConfig {
  const [firstArg, ...restArgs] = argv;
  const hasExplicitCommand = firstArg === "watch" || firstArg === "smoke-fixture";
  const command: CommandName = hasExplicitCommand ? firstArg : "watch";
  const flags = hasExplicitCommand ? restArgs : argv;

  const values = parseFlags(flags);
  const stateRoot = path.join(os.homedir(), ".douyin-live-welcome");

  return {
    command,
    url:
      values.url ??
      (command === "smoke-fixture"
        ? pathToFileURL(path.resolve("tests/fixtures/live-room.html")).toString()
        : "https://live.douyin.com/"),
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
