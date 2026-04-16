import { describe, expect, test } from "vitest";

import { parseCliArgs } from "../src/config.js";
import { formatSheetRow } from "../src/extraction.js";
import { resolveProviderSettings } from "../src/openclaw-config.js";
import type { AnalysisRecord, OpenClawConfigFile } from "../src/types.js";

describe("parseCliArgs", () => {
  test("requires an audio path and keeps approved defaults", () => {
    const config = parseCliArgs(["--audio", "/tmp/call.m4a"]);

    expect(config.audioPath).toBe("/tmp/call.m4a");
    expect(config.sheetTitle).toBe("客户通话记录");
    expect(config.docSpace).toBe("my_library");
    expect(config.outputJson).toBe(false);
  });

  test("supports explicit spreadsheet URL and JSON mode", () => {
    const config = parseCliArgs([
      "--audio",
      "/tmp/call.m4a",
      "--sheet-url",
      "https://feishu.cn/sheets/abc",
      "--json"
    ]);

    expect(config.sheetUrl).toBe("https://feishu.cn/sheets/abc");
    expect(config.outputJson).toBe(true);
  });
});

describe("resolveProviderSettings", () => {
  test("prefers explicit environment variables over OpenClaw config fallback", () => {
    const openclawConfig: OpenClawConfigFile = {
      models: {
        providers: {
          demo: {
            baseUrl: "https://example.invalid/v1",
            apiKey: "config-key",
            api: "openai-completions",
            models: [{ id: "demo-chat", name: "demo-chat" }]
          }
        }
      }
    };

    const settings = resolveProviderSettings(
      {
        CALL_ANALYZER_BASE_URL: "https://override.example/v1",
        CALL_ANALYZER_API_KEY: "env-key",
        CALL_ANALYZER_EXTRACT_MODEL: "env-chat",
        CALL_ANALYZER_TRANSCRIBE_MODEL: "env-whisper"
      },
      openclawConfig
    );

    expect(settings.baseUrl).toBe("https://override.example/v1");
    expect(settings.apiKey).toBe("env-key");
    expect(settings.extractModel).toBe("env-chat");
    expect(settings.transcribeModel).toBe("env-whisper");
  });

  test("falls back to the first OpenAI-compatible provider in OpenClaw config", () => {
    const openclawConfig: OpenClawConfigFile = {
      models: {
        providers: {
          anthropicLike: {
            baseUrl: "https://example.invalid/messages",
            api: "anthropic-messages",
            apiKey: "skip-me",
            models: [{ id: "k2p5", name: "K2" }]
          },
          gptCompatible: {
            baseUrl: "https://compatible.example/v1",
            api: "openai-completions",
            apiKey: "config-key",
            models: [{ id: "gpt-5.4", name: "GPT 5.4" }]
          }
        }
      }
    };

    const settings = resolveProviderSettings({}, openclawConfig);

    expect(settings.providerKey).toBe("gptCompatible");
    expect(settings.baseUrl).toBe("https://compatible.example/v1");
    expect(settings.apiKey).toBe("config-key");
    expect(settings.extractModel).toBe("gpt-5.4");
    expect(settings.transcribeModel).toBe("whisper-1");
  });
});

describe("formatSheetRow", () => {
  test("maps the normalized record to the approved seven-column spreadsheet row", () => {
    const record: AnalysisRecord = {
      date: "2026-04-13",
      customerName: "李总",
      phone: "13800138000",
      customerCategory: "高意向客户",
      needs: "短视频代运营，企业微信私域",
      engagementStage: "初次沟通",
      summary: "客户希望本周拿到方案。",
      nextActions: ["发送方案"],
      risks: ["预算待确认"],
      mindmap: [
        {
          title: "核心需求",
          children: [{ title: "短视频代运营" }]
        }
      ]
    };

    expect(formatSheetRow(record, "https://feishu.cn/docx/abc")).toEqual([
      "2026-04-13",
      "李总",
      "13800138000",
      "高意向客户",
      "短视频代运营，企业微信私域",
      "初次沟通",
      "https://feishu.cn/docx/abc"
    ]);
  });
});
