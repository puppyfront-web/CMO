import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { CommandOutput, CommandRunner } from "./types.js";

const execFileAsync = promisify(execFile);
const SHEET_HEADERS = ["日期", "客户名", "电话", "客户类别", "需求", "对接阶段", "打电话录音脑图"];

export async function ensureSpreadsheet(
  sheetUrl: string | undefined,
  sheetTitle: string,
  runner: CommandRunner = defaultCommandRunner
): Promise<string> {
  if (sheetUrl) {
    return sheetUrl;
  }

  const output = await runner("lark-cli", [
    "sheets",
    "+create",
    "--title",
    sheetTitle,
    "--headers",
    JSON.stringify(SHEET_HEADERS)
  ]);
  const payload = parseJsonOutput(output.stdout);
  const createdUrl = extractSpreadsheetUrl(payload);

  if (!createdUrl) {
    throw new Error("Unable to determine spreadsheet URL from lark-cli response.");
  }

  return createdUrl;
}

export async function createDetailDocument(
  title: string,
  markdown: string,
  docSpace: string,
  runner: CommandRunner = defaultCommandRunner
): Promise<string> {
  const output = await runner("lark-cli", [
    "docs",
    "+create",
    "--title",
    title,
    "--markdown",
    markdown,
    "--wiki-space",
    docSpace
  ]);
  const payload = parseJsonOutput(output.stdout);
  const createdUrl = extractDocumentUrl(payload);

  if (!createdUrl) {
    throw new Error("Unable to determine document URL from lark-cli response.");
  }

  return createdUrl;
}

export async function appendSpreadsheetRow(
  sheetUrl: string,
  row: string[],
  runner: CommandRunner = defaultCommandRunner
): Promise<void> {
  await runner("lark-cli", [
    "sheets",
    "+append",
    "--url",
    sheetUrl,
    "--values",
    JSON.stringify([row])
  ]);
}

export function extractSpreadsheetUrl(payload: unknown): string | undefined {
  return findFirstUrl(payload, /\/sheets\//);
}

export function extractDocumentUrl(payload: unknown): string | undefined {
  return findFirstUrl(payload, /\/(doc|docx|wiki)\//);
}

export async function defaultCommandRunner(command: string, args: string[]): Promise<CommandOutput> {
  try {
    const result = await execFileAsync(command, args, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error) {
    const message = formatCommandError(error);
    throw new Error(message);
  }
}

function parseJsonOutput(stdout: string): unknown {
  return JSON.parse(stdout);
}

function findFirstUrl(payload: unknown, pattern: RegExp): string | undefined {
  if (typeof payload === "string") {
    return pattern.test(payload) ? payload : undefined;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const match = findFirstUrl(item, pattern);
      if (match) {
        return match;
      }
    }
    return undefined;
  }

  if (payload && typeof payload === "object") {
    for (const value of Object.values(payload as Record<string, unknown>)) {
      const match = findFirstUrl(value, pattern);
      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

function formatCommandError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "lark-cli command failed.";
  }

  const stdout = typeof (error as { stdout?: unknown }).stdout === "string"
    ? ((error as { stdout?: string }).stdout ?? "")
    : "";
  const stderr = typeof (error as { stderr?: unknown }).stderr === "string"
    ? ((error as { stderr?: string }).stderr ?? "")
    : "";
  const combined = stdout || stderr;

  if (combined) {
    try {
      const parsed = JSON.parse(combined) as {
        error?: { message?: string; hint?: string };
      };
      const message = parsed.error?.message ?? "lark-cli command failed.";
      const hint = parsed.error?.hint;
      return hint ? `${message} ${hint}` : message;
    } catch {
      return combined.trim();
    }
  }

  return "lark-cli command failed.";
}
