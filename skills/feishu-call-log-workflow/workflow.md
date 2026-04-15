# Workflow

## Goal

Turn one call recording into:

1. Transcript
2. Structured row with fixed fields
3. Pure mind-map Feishu document
4. Spreadsheet append

## Artifact contract

Recommended runtime artifacts:

- `transcript.txt`
- `analysis.json`
- `mindmap.mmd`
- `feishu-doc.json`
- `feishu-sheet.json`

## Stages

### Stage 1: Input

Input is a local audio file.

Extension point:
- add future adapters for WeChat export folders, call archive folders, batch imports

### Stage 2: Local transcription

Use `scripts/transcribe_local.sh`.

Extension point:
- add audio cleanup
- add diarization
- add alternate local ASR engines

### Stage 3: OpenClaw analysis

The OpenClaw agent reads the transcript and extracts:

- `日期`
- `客户名`
- `电话`
- `客户类别`
- `需求`
- `对接阶段`
- `备注`

Extension point:
- add richer CRM fields
- add sentiment or urgency scoring
- add industry tagging normalization

### Stage 4: Mind-map generation

The OpenClaw agent writes Mermaid `mindmap` syntax.

Extension point:
- add domain-specific map templates
- add branch naming policies
- add visual themes

### Stage 5: Feishu outputs

- create or reuse target spreadsheet
- create pure mind-map document
- append row

Extension point:
- add notification sinks
- add CRM / Base sync
- add archive export

## Extensions

The workflow can be extended without replacing the core skill or core stages:

- `extensions/pre-transcribe.d/` for input expansion and audio preprocessing
- `extensions/post-transcribe.d/` for transcript cleanup and enrichment
- `extensions/post-analysis.d/` for CRM normalization, scoring, or extra outputs
- `extensions/post-write.d/` for notifications, syncs, and archives

Each extension should treat prior artifacts as inputs and append new artifacts into the same run directory.

## How to insert a new node

### Add a new normal workflow node

Do this when the node is part of the mandatory path for every run.

Examples:

- replace current local transcription with a new ASR stage
- insert `validate-analysis` before mind-map creation
- insert `normalize-industry` before sheet append

Rule:
- update the stage sequence in this file
- add or update the implementation script
- keep file-based artifact handoff stable

### Add a new agent node

Do this when the node needs reasoning.

Examples:

- lead scoring
- objection classification
- follow-up action planning
- quote drafting

Pattern:
- read current artifacts
- let OpenClaw or another agent produce a deterministic file
- save it beside existing artifacts

### Add a new sub-workflow node

Do this when the node is itself a reusable mini-process.

Examples:

- CRM sync workflow
- notification workflow
- quotation generation workflow
- task creation workflow

Pattern:
- keep the parent workflow stable
- call the sub-workflow from an extension or a dedicated stage
- exchange data through artifact files or stable JSON payloads

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

Rule:
- `打电话录音脑图` only stores the Feishu document link
- `备注` stores important extra findings, risks, constraints, or follow-up context that do not belong in the base fields

## Mind-map document rules

- one new document per call
- title format: `客户名-行业-日期`
- fallbacks:
  - `客户名-通话脑图-日期`
  - `行业-通话脑图-日期`
  - `通话脑图-日期`
- document content should be only one whiteboard / mind-map, no extra prose
