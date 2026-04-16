# Workflow

## Goal

Turn one Douyin live-room monitoring run into:

1. Real-time gift announcements
2. Raw session event capture
3. Post-live lead analysis from comments and interaction signals

## Architecture Position

This workflow follows the repository-wide composition model:

- `skills/`
  - own the reusable capability and runtime contract
- `agents/`
  - define the default agent entry that invokes the skill for a concrete job
- `workflow.md`
  - defines how the skill runtime and agent behavior combine into a complete business workflow

## Artifact contract

Recommended runtime artifacts:

- `session.json`
- `events.jsonl`
- `users.json`
- `leads.json`
- `report.md`

## Agent topology

Current topology:

1. entry agent
   - `agents/openai.yaml`
   - receives the user request and invokes the skill
2. runtime worker
   - the local runtime under `runtime/src/`
   - executes the monitoring, persistence, and analysis stages

This workflow is currently implemented as a single entry agent plus a local runtime pipeline. If later split into multiple agents, the handoff should remain artifact-based.

## Agent handoff contract

- entry agent -> runtime worker
  - inputs:
    - live-room URL
    - runtime options
- runtime worker -> downstream consumers
  - outputs:
    - `session.json`
    - `events.jsonl`
    - `users.json`
    - `leads.json`
    - `report.md`

## Stages

### Stage 1: Prepare runtime

- run `scripts/setup.sh` or `scripts/setup.ps1`
- ensure Playwright, Node dependencies, and local TTS dependencies are available

### Stage 2: Resolve live-room target

- require the exact live-room URL
- allow login/navigation help only when needed
- do not treat the Douyin homepage as the watched room

### Stage 3: Start watcher

- launch the browser runtime
- attach to the target room
- keep the watcher bound to the intended room only

### Stage 4: Real-time event handling

- announce gift events
- capture join, gift, and comment events into the session recorder
- ignore events from unrelated tabs or unrelated rooms

### Stage 5: Session finalization

- stop the watcher cleanly
- finalize session metadata and raw event storage

### Stage 6: Lead analysis

- read recorded session events
- score audience interaction
- generate `users.json`, `leads.json`, and `report.md`

## Current implementation mapping

- runtime entry
  - `runtime/src/cli.ts`
- watcher and page binding
  - `runtime/src/watcher.ts`
  - `runtime/src/observer-script.ts`
  - `runtime/src/webcast.ts`
- session persistence
  - `runtime/src/session.ts`
- lead analysis
  - `runtime/src/lead-analysis.ts`
- shutdown/finalization sequencing
  - `runtime/src/shutdown.ts`
- scripts
  - `scripts/setup.sh`
  - `scripts/run.sh`
  - `scripts/setup.ps1`
  - `scripts/run.ps1`

## Agent entry

Default agent entry:

- `agents/openai.yaml`

The current implementation uses one entry agent plus the local runtime worker. Future multi-agent splits should preserve the same artifact handoff contract.
