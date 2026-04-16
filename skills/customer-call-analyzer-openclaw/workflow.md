# Workflow

## Goal

Turn one customer-call audio file into:

1. A transcript
2. Structured customer-call extraction
3. A Feishu detail document with mind-map style outline
4. One appended spreadsheet row

## Architecture Position

This workflow follows the repository-wide composition model:

- `skills/`
  - own the reusable capability and runtime contract
- `agents/`
  - define the default agent entry that invokes the skill for a concrete job
- `workflow.md`
  - defines how the skill runtime and agent behavior combine into a complete business workflow

## Current runtime output contract

The current runtime returns or prints one final result object containing:

- `transcript`
- `analysis`
- `detailDocumentTitle`
- `detailDocumentUrl`
- `spreadsheetUrl`

## Preferred handoff artifacts

For future multi-agent or multi-stage orchestration, prefer stable file artifacts such as:

- `transcript.txt`
- `analysis.json`
- `detail-doc.json`
- `sheet-row.json`

These artifacts are the orchestration target, but the current runtime does not yet persist all of them to disk.

## Agent topology

Current topology:

1. entry agent
   - `agents/openai.yaml`
   - receives the user task and invokes the skill
2. runtime worker
   - the local runtime under `runtime/src/`
   - executes transcription, extraction, Feishu document creation, and sheet writing

This workflow is currently implemented as a single entry agent plus a local runtime pipeline. Future multi-agent splits should preserve the same normalized handoff contract.

## Agent handoff contract

- entry agent -> runtime worker
  - inputs:
    - audio file path
    - optional sheet URL
    - provider/model overrides
- runtime worker -> downstream consumers
  - normalized outputs:
    - transcript text
    - extracted analysis object
    - detail document URL
    - spreadsheet URL

## Stages

### Stage 1: Resolve configuration

- read provider and model settings from environment variables first
- fall back to `~/.openclaw/openclaw.json` when needed

### Stage 2: Transcribe audio

- send the input audio to the configured transcription endpoint
- keep the transcript as the factual source for downstream extraction

### Stage 3: Extract customer fields

- normalize the transcript into the fixed spreadsheet schema
- prepare detail-document content in a structured form

### Stage 4: Create Feishu detail document

- render the detail document with the call summary, key needs, risks, and outline
- capture the resulting Feishu document URL

### Stage 5: Resolve or create spreadsheet target

- use the provided spreadsheet URL when available
- otherwise create a default spreadsheet target

### Stage 6: Append row

- assemble the final row
- write one row into the Feishu spreadsheet with the detail document link

## Current implementation mapping

- runtime entry
  - `runtime/src/cli.ts`
- configuration
  - `runtime/src/config.ts`
  - `runtime/src/openclaw-config.ts`
- extraction and normalization
  - `runtime/src/extraction.ts`
  - `runtime/src/types.ts`
- model client
  - `runtime/src/model-client.ts`
- Feishu integration
  - `runtime/src/feishu.ts`
- scripts
  - `scripts/setup.sh`
  - `scripts/run.sh`

## Agent entry

Default agent entry:

- `agents/openai.yaml`

The current implementation uses one entry agent plus the local runtime worker. Future multi-agent splits should preserve the same normalized handoff contract.
