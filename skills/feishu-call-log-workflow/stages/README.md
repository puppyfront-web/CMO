# Stages

These are the normal workflow nodes of this skill. The skill is the OpenClaw entrypoint; the stages are the actual execution path.

## Core stage model

1. `resolve-sheet`
2. `transcribe-audio`
3. `extract-fields`
4. `build-mindmap`
5. `create-feishu-doc`
6. `append-sheet-row`

## Current implementation mapping

- `resolve-sheet`
  - state read/write: `scripts/state.py`
  - create default sheet: `scripts/create_default_sheet.sh`
- `transcribe-audio`
  - local ASR: `scripts/transcribe_local.sh`
- `extract-fields`
  - current OpenClaw agent reads transcript and writes `analysis.json`
- `build-mindmap`
  - current OpenClaw agent writes Mermaid `mindmap.mmd`
- `create-feishu-doc`
  - `scripts/create_mindmap_doc.sh`
- `append-sheet-row`
  - `scripts/append_sheet_row.sh`

## Where the agent runs

The OpenClaw skill does not replace the workflow. It orchestrates it.

- The skill is the entry and routing contract
- The stage scripts are the normal executable nodes
- The OpenClaw agent currently acts as the execution engine for:
  - `extract-fields`
  - `build-mindmap`

That means future teams can swap a stage implementation without changing the whole skill.
