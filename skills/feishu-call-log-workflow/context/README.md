# Context Engineering

This directory defines the stage-specific context contract for `feishu-call-log-workflow`.

## Purpose

The workflow has one global contract and multiple stage-local contracts:

- `PROMPT.md`
  - global workflow rules shared by every run
- `context/stage-context.json`
  - machine-readable stage-to-context mapping
- `context/<stage>.md`
  - focused context for one stage only

Use this layer to keep each stage bounded. A stage should only receive the minimum context needed to produce its declared artifact.

## Loading order

For each stage:

1. Load `PROMPT.md`
2. Load `context/stage-context.json`
3. Load the current stage file such as `context/extract-fields.md`
4. Load only the input artifacts listed for that stage

## Design rules

- Keep one stage file focused on one stage
- Define explicit inputs, outputs, constraints, and failure behavior
- Prefer artifacts over implicit memory passing
- Do not repeat the full workflow prompt inside every stage file
- If a stage needs new material, add it to the stage file and the JSON index together
