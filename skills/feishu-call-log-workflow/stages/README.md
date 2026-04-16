# Stages

These are the normal workflow nodes of this skill. The skill is the OpenClaw entrypoint; the stages are the actual execution path.

## Core stage model

1. `resolve-sheet`
2. `transcribe-audio`
3. `extract-fields`
4. `build-mindmap`
5. `create-mindmap-doc`
6. `create-demand-doc`
7. `create-quotation-sheet`
8. `append-sheet-row`

## Context Engineering mapping

Every stage should load:

1. `PROMPT.md`
2. `context/stage-context.json`
3. the current stage file
4. only the artifacts declared for that stage

Stage map:

- `resolve-sheet`
  - `context/resolve-sheet.md`
- `transcribe-audio`
  - `context/transcribe-audio.md`
- `extract-fields`
  - `context/extract-fields.md`
- `build-mindmap`
  - `context/build-mindmap.md`
- `create-mindmap-doc`
  - `context/create-mindmap-doc.md`
- `create-demand-doc`
  - `context/create-demand-doc.md`
- `create-quotation-sheet`
  - `context/create-quotation-sheet.md`
- `append-sheet-row`
  - `context/append-sheet-row.md`

## Current implementation mapping

- `resolve-sheet`
  - state read/write: `scripts/state.py`
  - create default sheet: `scripts/create_default_sheet.sh`
  - output artifact: `sheet-target.json`
- `transcribe-audio`
  - local ASR: `scripts/transcribe_local.sh`
  - output artifact: `transcript.txt`
- `extract-fields`
  - current OpenClaw agent reads transcript and writes `analysis.json`
- `build-mindmap`
  - current OpenClaw agent writes Mermaid `mindmap.mmd`
- `create-mindmap-doc`
  - `scripts/create_mindmap_doc.sh`
  - output artifact: `mindmap-doc.json`
- `create-demand-doc`
  - current OpenClaw agent writes `demand.md`
  - `scripts/create_markdown_doc.sh`
  - output artifacts: `demand.md`, `demand-doc.json`
- `create-quotation-sheet`
  - current OpenClaw agent writes `quotation-sheet-data.json`
  - `scripts/create_quotation_sheet.sh`
  - output artifacts: `quotation-sheet-data.json`, `quotation-sheet.json`
- `append-sheet-row`
  - `scripts/append_sheet_row.sh`
  - output artifacts: `sheet-row.json`, `feishu-sheet.json`

## Where the agent runs

The OpenClaw skill does not replace the workflow. It orchestrates it.

- The skill is the entry and routing contract
- The stage scripts are the normal executable nodes
- The OpenClaw agent currently acts as the execution engine for:
  - `extract-fields`
  - `build-mindmap`
  - `create-demand-doc` content
  - `create-quotation-sheet` content

That means future teams can swap a stage implementation without changing the whole skill.
