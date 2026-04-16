# Workflow

## Goal

Turn one call recording into:

1. Transcript
2. Structured spreadsheet row
3. Pure mind-map Feishu document
4. Demand document
5. Quotation spreadsheet

## Artifact contract

Recommended runtime artifacts:

- `sheet-target.json`
- `transcript.txt`
- `analysis.json`
- `mindmap.mmd`
- `demand.md`
- `quotation-sheet-data.json`
- `mindmap-doc.json`
- `demand-doc.json`
- `quotation-sheet.json`
- `sheet-row.json`
- `feishu-sheet.json`

## Agent topology

Current topology:

1. entry agent
   - `agents/openai.yaml`
   - receives the user task and invokes the workflow skill
2. stage agents / stage workers
   - the workflow stages under `stages/README.md`
   - agent-backed stages currently include:
     - `extract-fields`
     - `build-mindmap`
     - `create-demand-doc`
     - `create-quotation-sheet`
   - script-backed stages currently include:
     - `resolve-sheet`
     - `transcribe-audio`
     - `create-mindmap-doc`
     - `append-sheet-row`

This workflow is already organized as a workflow-ready composition of one entry agent plus multiple stage workers, with the stage contract carried by artifacts.

## Agent handoff contract

- entry agent -> stage workers
  - handoff medium:
    - declared artifacts
    - stage-local context files
- stage worker -> next stage worker
  - handoff medium:
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

## Context Engineering

This workflow is context-engineered per stage, not only per workflow.

Global context:

- `PROMPT.md`

Stage-local context:

- `context/stage-context.json`
- `context/resolve-sheet.md`
- `context/transcribe-audio.md`
- `context/extract-fields.md`
- `context/build-mindmap.md`
- `context/create-mindmap-doc.md`
- `context/create-demand-doc.md`
- `context/create-quotation-sheet.md`
- `context/append-sheet-row.md`

Loading rule:

1. Load `PROMPT.md`
2. Load `context/stage-context.json`
3. Load the current stage file
4. Load only the artifacts declared for that stage

Do not pass the entire workflow state into every stage by default.

## Stages

### Stage 1: `resolve-sheet`

Resolve or create the spreadsheet target for this run.

Stage context:

- `context/resolve-sheet.md`

Primary artifact:

- `sheet-target.json`

### Stage 2: `transcribe-audio`

Use `scripts/transcribe_local.sh` to turn one local audio file into `transcript.txt`.

Stage context:

- `context/transcribe-audio.md`

### Stage 3: `extract-fields`

The OpenClaw agent reads the transcript and extracts:

- `日期`
- `客户名`
- `电话`
- `客户类别`
- `需求`
- `对接阶段`
- `备注`

Stage context:

- `context/extract-fields.md`

Primary artifact:

- `analysis.json`

### Stage 4: `build-mindmap`

The OpenClaw agent writes Mermaid `mindmap` syntax.

Stage context:

- `context/build-mindmap.md`

Primary artifact:

- `mindmap.mmd`

### Stage 5: `create-mindmap-doc`

Create the pure Feishu mind-map document from `mindmap.mmd`.

Stage context:

- `context/create-mindmap-doc.md`

Primary artifact:

- `mindmap-doc.json`

### Stage 6: `create-demand-doc`

The OpenClaw agent writes `demand.md`.

The demand document must include:

- 客户背景
- 客户需求
- 整体技术架构设计

This stage should behave like a `需求分析师 + 解决方案架构师` joint output:

- identify the real business scope and complexity from the recording
- produce a right-sized solution design instead of a generic oversized architecture

Stage context:

- `context/create-demand-doc.md`

Primary artifacts:

- `demand.md`
- `demand-doc.json`

### Stage 7: `create-quotation-sheet`

The OpenClaw agent writes `quotation-sheet-data.json`.

The quotation sheet must be based on the demand document and current market pricing calibration. It should provide:

- 基础版
- 高级版
- 旗舰版

Each tier should include scope, deliverables, assumptions, schedule, pricing, and exclusions.

This stage must price according to the inferred complexity level from the recording and the demand analysis, so lightweight needs stay lightweight and genuinely complex needs can be priced higher with explicit justification.

Default pricing posture:

- if the project looks like a small custom tool, teaching aid, lightweight automation, or MVP validation, quote conservatively
- do not default to large productized-system pricing
- only move into higher ranges when complexity clearly includes multi-system integration, local deployment hardening, large-scale data treatment, or long-term product-style delivery

Stage context:

- `context/create-quotation-sheet.md`

Primary artifacts:

- `quotation-sheet-data.json`
- `quotation-sheet.json`

### Stage 8: `append-sheet-row`

Assemble the final row and append it to the resolved spreadsheet.

Stage context:

- `context/append-sheet-row.md`

Primary artifacts:

- `sheet-row.json`
- `feishu-sheet.json`

## Spreadsheet target rules

1. If user explicitly says replace/change spreadsheet URL, replace saved default
2. Else if saved default exists, reuse it silently
3. Else ask whether user wants to specify a spreadsheet
4. If not specified, create a new spreadsheet and save it as default

## Spreadsheet schema

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

- `打电话录音脑图` only stores the Feishu document link
- `备注` stores important extra findings, risks, constraints, or follow-up context
- `需求文档` stores the generated demand document link
- `报价表` stores the generated quotation spreadsheet link

## Document title rules

Mind-map title:

- `客户名-行业-日期`
- fallback:
  - `客户名-通话脑图-日期`
  - `行业-通话脑图-日期`
  - `通话脑图-日期`

Demand document title:

- `客户名-行业-需求文档-日期`

Quotation document title:

- `客户名-行业-报价表-日期`

## Extensions

The workflow can be extended without replacing the core skill or core stages:

- `extensions/pre-transcribe.d/`
- `extensions/post-transcribe.d/`
- `extensions/post-analysis.d/`
- `extensions/post-write.d/`
