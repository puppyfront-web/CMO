---
name: feishu-call-log-workflow
description: Use when an OpenClaw user wants a call recording analyzed into customer fields, a mind-map plus demand document created in Feishu, a quotation spreadsheet created in Feishu Sheets, and one row appended into a reusable Feishu spreadsheet.
metadata: {"openclaw":{"skillKey":"feishu-call-log-workflow","emoji":"🧠","requires":{"bins":["node","npm","python3","lark-cli","ffmpeg"],"os":["darwin","linux","win32"]}}}
---

# Feishu Call Log Workflow

This workflow turns one local call recording into:

1. A local transcript
2. One pure mind-map Feishu document
3. One demand document
4. One quotation spreadsheet
5. One spreadsheet row in the fixed schema

## Fixed spreadsheet schema

- `日期`
- `客户名`
- `电话`
- `客户类别`
- `需求`
- `对接阶段`
- `打电话录音脑图`
- `备注`
- `需求文档`
- `报价表`

Rules:

- `打电话录音脑图` only stores the Feishu mind-map document link
- `备注` stores important extra findings that do not fit the base fields
- `需求文档` stores the Feishu demand document link
- `报价表` stores the Feishu quotation spreadsheet link

## Default behavior

- If a default spreadsheet URL has already been saved, reuse it without asking
- Only switch spreadsheets when the user explicitly asks to replace/change the spreadsheet URL or gives a new spreadsheet URL for this workflow
- If no default spreadsheet exists yet:
  - ask whether the user wants to specify one
  - if not, create a new spreadsheet and save it as the default
- Mind-map, demand documents, and quotation spreadsheets are newly created for every call

## Built-In Prompt Contract

Every execution of this skill should load and follow:

- `PROMPT.md`
- `context/stage-context.json`
- the current stage file under `context/`

Treat these files as the built-in execution contract for this workflow, not as optional reference material.

## Context Engineering

This workflow uses two context layers:

- Global context
  - `PROMPT.md`
  - shared workflow rules, field rules, document rules, and pricing calibration
- Stage-local context
  - `context/stage-context.json`
  - `context/<stage>.md`
  - one focused contract per stage

Each stage should load only its declared inputs plus its stage-local context. Do not pass the full workflow state to every stage by default.

## Stage Model

This workflow uses explicit normal nodes:

- `resolve-sheet`
- `transcribe-audio`
- `extract-fields`
- `build-mindmap`
- `create-mindmap-doc`
- `create-demand-doc`
- `create-quotation-sheet`
- `append-sheet-row`

The OpenClaw skill is the entrypoint and orchestrator. The actual execution happens in stage scripts and agent-backed stage implementations.

Recommended runtime artifacts now include:

- `sheet-target.json`
- `transcript.txt`
- `analysis.json`
- `mindmap.mmd`
- `mindmap-doc.json`
- `demand.md`
- `demand-doc.json`
- `quotation-sheet-data.json`
- `quotation-sheet.json`
- `sheet-row.json`
- `feishu-sheet.json`

## Core execution path

1. Prepare the helper environment:

```bash
SKILL_DIR="$PWD/skills/feishu-call-log-workflow"
bash "$SKILL_DIR/scripts/setup.sh"
```

2. Resolve or create the spreadsheet target:

```bash
python3 "$SKILL_DIR/scripts/state.py" get-sheet
python3 "$SKILL_DIR/scripts/state.py" set-sheet "https://your.feishu.cn/sheets/xxxx"
bash "$SKILL_DIR/scripts/create_default_sheet.sh" "客户通话录音分析"
```

3. Transcribe the audio:

```bash
TRANSCRIPT_PATH=$(bash "$SKILL_DIR/scripts/transcribe_local.sh" "/absolute/path/to/call.mp3")
```

4. Use the built-in prompt contract to extract:

- `日期`
- `客户名`
- `电话`
- `客户类别`
- `需求`
- `对接阶段`
- `备注`

5. Generate three local artifacts:

- `mindmap.mmd`
- `demand.md`
- `quotation-sheet-data.json`

6. Create the Feishu outputs:

```bash
bash "$SKILL_DIR/scripts/create_mindmap_doc.sh" "客户名-行业-日期" /tmp/call-mindmap.mmd
bash "$SKILL_DIR/scripts/create_markdown_doc.sh" "客户名-行业-需求文档-日期" /tmp/demand.md
bash "$SKILL_DIR/scripts/create_quotation_sheet.sh" "客户名-行业-报价表-日期" /tmp/quotation-sheet-data.json
```

7. Append one spreadsheet row:

```bash
bash "$SKILL_DIR/scripts/append_sheet_row.sh" \
  "https://your.feishu.cn/sheets/xxxx" \
  '["2026-04-16","李老师","未提取到","教育行业 / 中学历史老师","需求内容","初步沟通 / 待评估","https://www.feishu.cn/docx/mindmap","备注内容","https://www.feishu.cn/docx/demand","https://www.feishu.cn/docx/quote"]'
```

## Extensions

Optional capabilities should be added as extensions, not by rewriting the core path.

Use:

```bash
bash "$SKILL_DIR/scripts/run_extension_dir.sh" "$SKILL_DIR/extensions/post-analysis.d" "/path/to/artifacts"
```

## References

- `INSTALL.md`
- `README.md`
- `workflow.md`
- `PROMPT.md`
- `context/README.md`
- `context/stage-context.json`
- `stages/README.md`
- `extensions/README.md`
