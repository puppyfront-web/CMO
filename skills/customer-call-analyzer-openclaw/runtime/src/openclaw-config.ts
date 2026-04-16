import fs from "node:fs";

import type { CliConfig, OpenClawConfigFile, OpenClawProviderConfig, ProviderSettings } from "./types.js";

type EnvMap = NodeJS.ProcessEnv | Record<string, string | undefined>;

const ENV_KEYS = {
  baseUrl: ["CALL_ANALYZER_BASE_URL", "OPENCLAW_CALL_ANALYZER_BASE_URL"],
  apiKey: ["CALL_ANALYZER_API_KEY", "OPENCLAW_CALL_ANALYZER_API_KEY"],
  provider: ["CALL_ANALYZER_PROVIDER", "OPENCLAW_CALL_ANALYZER_PROVIDER"],
  transcribeModel: [
    "CALL_ANALYZER_TRANSCRIBE_MODEL",
    "OPENCLAW_CALL_ANALYZER_TRANSCRIBE_MODEL"
  ],
  extractModel: ["CALL_ANALYZER_EXTRACT_MODEL", "OPENCLAW_CALL_ANALYZER_EXTRACT_MODEL"],
  sheetUrl: ["CALL_ANALYZER_SHEET_URL", "OPENCLAW_CALL_ANALYZER_SHEET_URL"]
} as const;

export function loadOpenClawConfig(filePath: string): OpenClawConfigFile | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content) as OpenClawConfigFile;
}

export function resolveSpreadsheetUrlFromEnv(env: EnvMap): string | undefined {
  return firstDefined(env, ENV_KEYS.sheetUrl);
}

export function resolveProviderSettings(
  env: EnvMap,
  config: OpenClawConfigFile | undefined,
  cliConfig?: Pick<CliConfig, "providerKey" | "transcribeModel" | "extractModel">
): ProviderSettings {
  const requestedProviderKey =
    cliConfig?.providerKey ?? firstDefined(env, ENV_KEYS.provider) ?? undefined;
  const providerEntry = pickProvider(config, requestedProviderKey);
  const providerKey = requestedProviderKey ?? providerEntry?.[0] ?? "env";
  const provider = providerEntry?.[1];

  const baseUrl = cliConfigValue(
    cliConfig?.providerKey ? undefined : undefined,
    firstDefined(env, ENV_KEYS.baseUrl),
    provider?.baseUrl
  );
  const apiKey = cliConfigValue(undefined, firstDefined(env, ENV_KEYS.apiKey), provider?.apiKey);
  const extractModel = cliConfigValue(
    cliConfig?.extractModel,
    firstDefined(env, ENV_KEYS.extractModel),
    provider?.models?.[0]?.id
  );
  const transcribeModel = cliConfigValue(
    cliConfig?.transcribeModel,
    firstDefined(env, ENV_KEYS.transcribeModel),
    "whisper-1"
  ) ?? "whisper-1";

  if (!baseUrl || !apiKey || !extractModel) {
    throw new Error(
      "Missing model provider settings. Set CALL_ANALYZER_BASE_URL, CALL_ANALYZER_API_KEY, and CALL_ANALYZER_EXTRACT_MODEL or provide an OpenAI-compatible provider in ~/.openclaw/openclaw.json."
    );
  }

  return {
    providerKey,
    baseUrl: stripTrailingSlash(baseUrl),
    apiKey,
    extractModel,
    transcribeModel
  };
}

function pickProvider(
  config: OpenClawConfigFile | undefined,
  requestedProviderKey?: string
): [string, OpenClawProviderConfig] | undefined {
  const providers = config?.models?.providers;

  if (!providers) {
    return undefined;
  }

  if (requestedProviderKey && providers[requestedProviderKey]) {
    return [requestedProviderKey, providers[requestedProviderKey]];
  }

  return Object.entries(providers).find(([, provider]) => provider.api?.startsWith("openai-"));
}

function firstDefined(env: EnvMap, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value) {
      return value;
    }
  }

  return undefined;
}

function cliConfigValue(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && value.length > 0);
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
