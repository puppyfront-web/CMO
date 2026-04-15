# Extensions

Extensions are optional nodes that run alongside the normal workflow stages. They are not the main path.

Use extensions when you want to insert extra capability without rewriting the core stage sequence.

## Extension directories

- `pre-transcribe.d/`
- `post-transcribe.d/`
- `post-analysis.d/`
- `post-write.d/`

## Contract

- Put executable `.sh`, `.py`, or other runnable files into the relevant directory
- Extensions run in lexical order
- Each extension receives the artifact directory as its first argument
- Extensions should read existing artifacts and write new artifacts beside them
- Extensions should be additive and avoid mutating prior outputs unless they are explicitly a normalization step

## Recommended artifact names

- `transcript.txt`
- `analysis.json`
- `mindmap.mmd`
- `feishu-doc.json`
- `feishu-sheet.json`

## Add an agent node

Use an agent node when the inserted step needs reasoning, summarization, classification, planning, or content generation.

Recommended pattern:

1. Read one or more existing artifacts from the artifact directory
2. Ask OpenClaw or another agent to produce a deterministic output file
3. Save the result back into the same artifact directory

Example:

- directory: `extensions/post-analysis.d/`
- purpose: enrich `analysis.json` with urgency, lead score, or follow-up suggestions
- output: `analysis.enriched.json`

## Add a workflow node

Use a workflow node when the inserted step is tool-heavy, deterministic, or itself a mini-pipeline.

Recommended pattern:

1. Read the current artifacts
2. Run the external script or sub-workflow
3. Emit a new artifact or side effect
4. Keep the interface file-based so the parent workflow stays stable

Example:

- directory: `extensions/post-write.d/`
- purpose: push data into CRM, send IM notification, or create a follow-up task
- output: `crm-sync.json` or `notification.json`

## Runner

Use the shared runner:

```bash
bash scripts/run_extension_dir.sh extensions/post-analysis.d /path/to/artifacts
```
