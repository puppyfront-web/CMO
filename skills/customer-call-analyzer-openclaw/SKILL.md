---
name: customer_call_analyzer
description: Use when an OpenClaw user wants a customer-call audio recording transcribed, summarized into key customer fields, and written directly into a Feishu spreadsheet with a linked detail document.
metadata: {"openclaw":{"skillKey":"customer_call_analyzer","emoji":"📞","requires":{"bins":["node","npm","lark-cli"],"os":["darwin","linux","win32"]}}}
---

# Customer Call Analyzer

This OpenClaw skill accepts a local customer-call audio file, transcribes it with the current model provider configuration, extracts key CRM-style fields, creates a Feishu detail document with a mind-map outline, and appends the result into a Feishu spreadsheet.

## Use this skill when

- The input is an audio file for a customer conversation.
- The user wants customer info extracted directly into a Feishu spreadsheet.
- The final spreadsheet should contain these columns:
  - `日期`
  - `客户名`
  - `电话`
  - `客户类别`
  - `需求`
  - `对接阶段`
  - `打电话录音脑图`
- The last column should point to a Feishu detail document rather than store raw long text.

## Execution rules

- Prefer the workspace-local copy at `<workspace>/skills/customer-call-analyzer-openclaw`.
- Use the included scripts directly.
- Read provider settings from environment variables first, then fall back to `~/.openclaw/openclaw.json`.
- Treat the model endpoint as OpenAI-compatible for audio transcription and chat completions in v1.
- If no spreadsheet URL is supplied, create a new spreadsheet titled `客户通话记录`.

## Standard flow

1. Bootstrap the runtime:

```bash
SKILL_DIR="$PWD/skills/customer-call-analyzer-openclaw"
bash "$SKILL_DIR/scripts/setup.sh"
```

2. Analyze an audio file and auto-create a spreadsheet if needed:

```bash
SKILL_DIR="$PWD/skills/customer-call-analyzer-openclaw"
bash "$SKILL_DIR/scripts/run.sh" --audio "/absolute/path/to/call.m4a"
```

3. Append to an existing spreadsheet:

```bash
SKILL_DIR="$PWD/skills/customer-call-analyzer-openclaw"
bash "$SKILL_DIR/scripts/run.sh" \
  --audio "/absolute/path/to/call.m4a" \
  --sheet-url "https://your-domain.feishu.cn/sheets/xxxx"
```

## Config

Supported environment variables:

- `CALL_ANALYZER_BASE_URL` or `OPENCLAW_CALL_ANALYZER_BASE_URL`
- `CALL_ANALYZER_API_KEY` or `OPENCLAW_CALL_ANALYZER_API_KEY`
- `CALL_ANALYZER_PROVIDER` or `OPENCLAW_CALL_ANALYZER_PROVIDER`
- `CALL_ANALYZER_TRANSCRIBE_MODEL` or `OPENCLAW_CALL_ANALYZER_TRANSCRIBE_MODEL`
- `CALL_ANALYZER_EXTRACT_MODEL` or `OPENCLAW_CALL_ANALYZER_EXTRACT_MODEL`
- `CALL_ANALYZER_SHEET_URL` or `OPENCLAW_CALL_ANALYZER_SHEET_URL`

## Notes

- The runtime uses `lark-cli`, so missing Feishu scopes should be granted through `lark-cli auth login --scope ...`.
- The detail document renders the mind-map as a nested outline in Feishu docs for stability.
- Use `--json` if you want the runtime to print a machine-readable result after writing to Feishu.

## References

- `references/runtime.md`
- `workflow.md`
