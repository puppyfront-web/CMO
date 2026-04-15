---
name: feishu-call-log-workflow
description: Use when an OpenClaw user wants a call recording analyzed into fixed customer fields, a pure mind-map document created in Feishu, and one row appended into a reusable Feishu spreadsheet.
metadata: {"openclaw":{"skillKey":"feishu-call-log-workflow","emoji":"🧠","requires":{"bins":["node","npm","python3","lark-cli","ffmpeg"],"os":["darwin","linux","win32"]}}}
---

# Feishu Call Log Workflow

This workflow turns a local call recording into three outputs:

1. A local transcript
2. One pure mind-map Feishu document
3. One spreadsheet row in the fixed table schema

## Fixed table schema

- `日期`
- `客户名`
- `电话`
- `客户类别`
- `需求`
- `对接阶段`
- `打电话录音脑图`
- `备注`

`G` only stores the Feishu mind-map document link. `H` stores important extra findings that do not fit the base fields.

## Default behavior

- If a default spreadsheet URL has already been saved, reuse it without asking.
- Only switch spreadsheets when the user explicitly says to replace/change the spreadsheet URL or gives a new spreadsheet URL for this workflow.
- If no default spreadsheet exists yet:
  - ask whether the user wants to specify one
  - if not, create a new spreadsheet and save it as the default
- Mind-map documents are always newly created per call
- Mind-map document title uses `客户名-行业-日期` when possible

## Built-In Prompt Contract

Every execution of this skill should load and follow:

- `PROMPT.md`

Treat that file as the built-in extraction and writeback contract for this workflow, not as optional reference material.

User requests may add constraints, but they must not break the fixed schema, mind-map rules, or spreadsheet write rules defined in `PROMPT.md`.

## Workflow

1. Ensure helper environment is ready:

```bash
SKILL_DIR="$PWD/skills/feishu-call-log-workflow"
bash "$SKILL_DIR/scripts/setup.sh"
```

2. Resolve spreadsheet target:

- Read current default:

```bash
python3 "$SKILL_DIR/scripts/state.py" get-sheet
```

- Save/replace default when user explicitly changes it:

```bash
python3 "$SKILL_DIR/scripts/state.py" set-sheet "https://your.feishu.cn/sheets/xxxx"
```

- Create a new default spreadsheet when needed:

```bash
bash "$SKILL_DIR/scripts/create_default_sheet.sh" "客户通话录音分析"
```

3. Transcribe the audio locally:

```bash
TRANSCRIPT_PATH=$(bash "$SKILL_DIR/scripts/transcribe_local.sh" "/absolute/path/to/call.mp3")
```

4. Read the transcript, then use the current OpenClaw model to extract:

- `日期`
- `客户名`
- `电话`
- `客户类别`
- `需求`
- `对接阶段`
- `备注`

5. Generate Mermaid mind-map content and save it locally:

```bash
cat > /tmp/call-mindmap.mmd <<'EOF'
mindmap
  root((客户名需求))
    客户背景
    核心需求
    痛点
    当前阶段
EOF
```

6. Create the pure mind-map Feishu document:

```bash
bash "$SKILL_DIR/scripts/create_mindmap_doc.sh" "客户名-行业-日期" /tmp/call-mindmap.mmd
```

7. Append one spreadsheet row:

```bash
bash "$SKILL_DIR/scripts/append_sheet_row.sh" \
  "https://your.feishu.cn/sheets/xxxx" \
  '["2026-04-15","李老师","未提取到","教育行业 / 中学历史老师","需求内容","初步沟通 / 待评估","https://www.feishu.cn/docx/xxx","备注内容"]'
```

## Stage Model

This workflow uses explicit normal nodes:

- `resolve-sheet`
- `transcribe-audio`
- `extract-fields`
- `build-mindmap`
- `create-feishu-doc`
- `append-sheet-row`

The OpenClaw skill is the entrypoint and orchestrator. The actual execution happens in stage scripts and agent-backed stage implementations.

## Extensions

Optional capabilities should be added as extensions, not by rewriting the core path.

Drop future executable extensions into:

- `extensions/pre-transcribe.d/`
- `extensions/post-transcribe.d/`
- `extensions/post-analysis.d/`
- `extensions/post-write.d/`

Run them through:

```bash
bash "$SKILL_DIR/scripts/run_extension_dir.sh" "$SKILL_DIR/extensions/post-analysis.d" "/path/to/artifacts"
```

Each extension receives the current artifact directory and can enrich the workflow without rewriting the core stages.

See `workflow.md`, `stages/README.md`, and `extensions/README.md` for the execution and integration contract.

## Install globally in OpenClaw

```bash
SKILL_DIR="$PWD/skills/feishu-call-log-workflow"
bash "$SKILL_DIR/scripts/install-global.sh"
```

## References

- `workflow.md`
- `INSTALL.md`
- `stages/README.md`
- `extensions/README.md`
- `PROMPT.md`
