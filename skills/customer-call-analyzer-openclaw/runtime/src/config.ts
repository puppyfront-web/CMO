import os from "node:os";
import path from "node:path";

import type { CliConfig } from "./types.js";

export function parseCliArgs(argv: string[]): CliConfig {
  const values = parseFlags(argv);
  const audioPath = values.audio;

  if (!audioPath) {
    throw new Error("Missing required --audio <path> argument.");
  }

  return {
    audioPath,
    sheetUrl: values["sheet-url"],
    sheetTitle: values["sheet-title"] ?? "客户通话记录",
    docSpace: values["doc-space"] ?? "my_library",
    providerKey: values.provider,
    transcribeModel: values["transcribe-model"],
    extractModel: values["extract-model"],
    outputJson: parseBoolean(values.json, false),
    openclawConfigPath:
      values["openclaw-config"] ?? path.join(os.homedir(), ".openclaw", "openclaw.json")
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
