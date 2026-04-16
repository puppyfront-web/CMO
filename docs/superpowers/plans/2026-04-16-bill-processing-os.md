# Bill Processing OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an OpenClaw-deliverable bill processing Skill and local-first workflow runtime that can classify, parse, extract, validate, review, learn bill types, and write normalized output into Excel.

**Architecture:** Create a new `packages/bill-processing-os` development runtime organized by domain responsibility and a matching `skills/bill-processing-os-openclaw` distribution package for customer delivery. The runtime will drive a five-layer deterministic workflow around `BillDocument`, persist replayable artifacts per run, and use agent-assisted extraction nodes only inside controlled workflow boundaries.

**Tech Stack:** TypeScript, Node.js, Vitest, JSON Schema/Zod-style validation, local artifact storage, OCR/markdown adapters, Excel writer library

---

## Repository Management Constraints

This repository will host multiple customer-delivery workflows over time. Keep this implementation isolated by default:

- Only create files under `packages/bill-processing-os` and `skills/bill-processing-os-openclaw` for this workflow.
- Do not introduce shared utilities outside this workflow unless reuse is already proven.
- Keep all generated customer artifacts in gitignored paths.
- Keep tests package-local so this workflow can evolve without destabilizing unrelated customer workflows.

## File Structure

Create the runtime and skill with these primary units:

- `packages/bill-processing-os/package.json`
- `packages/bill-processing-os/tsconfig.json`
- `packages/bill-processing-os/src/domain/`
- `packages/bill-processing-os/src/router/`
- `packages/bill-processing-os/src/type-match/`
- `packages/bill-processing-os/src/parse/`
- `packages/bill-processing-os/src/extract/`
- `packages/bill-processing-os/src/validate/`
- `packages/bill-processing-os/src/write/`
- `packages/bill-processing-os/src/review/`
- `packages/bill-processing-os/src/template/`
- `packages/bill-processing-os/src/storage/`
- `packages/bill-processing-os/src/cli/`
- `packages/bill-processing-os/tests/`
- `skills/bill-processing-os-openclaw/`

## Delivery and TDD Rules

Every implementation task must follow these rules:

- Write the failing test first.
- Run the targeted test and confirm the failure is for the expected reason.
- Write the minimal production code to make that exact test pass.
- Re-run the targeted test, then the affected test slice.
- Refactor only while staying green.

No production code is allowed before a failing test exists for that behavior.

## Task 1: Bootstrap runtime package and core domain contracts

**Files:**
- Create: `packages/bill-processing-os/package.json`
- Create: `packages/bill-processing-os/tsconfig.json`
- Create: `packages/bill-processing-os/src/domain/bill-document.ts`
- Create: `packages/bill-processing-os/src/domain/bill-template.ts`
- Create: `packages/bill-processing-os/src/domain/excel-mapping.ts`
- Create: `packages/bill-processing-os/src/domain/review-task.ts`
- Create: `packages/bill-processing-os/src/domain/execution.ts`
- Create: `packages/bill-processing-os/tests/domain.test.ts`

- [ ] Define `BillDocument`, `BillTypeTemplate`, `ExcelTemplateMapping`, `ReviewTask`, document states, execution modes, and complexity flags as stable TypeScript types.
- [ ] Keep domain files pure and framework-agnostic.
- [ ] Add tests for state values, required fields, and serialization shape.

## Task 2: Build run storage, replay artifacts, and structured logging

**Files:**
- Create: `packages/bill-processing-os/src/storage/run-store.ts`
- Create: `packages/bill-processing-os/src/storage/document-store.ts`
- Create: `packages/bill-processing-os/src/storage/event-log.ts`
- Create: `packages/bill-processing-os/src/storage/logger.ts`
- Create: `packages/bill-processing-os/tests/storage.test.ts`

- [ ] Implement run directory creation under `~/.bill-processing-os/runs/`.
- [ ] Persist `task.json`, per-document raw/parsed/normalized/validation JSON, and `events.jsonl`.
- [ ] Add structured logs with `trace_id`, document state transitions, and decision events.
- [ ] Test single-document and batch-run artifact persistence.

## Task 3: Implement task router and execution context builder

**Files:**
- Create: `packages/bill-processing-os/src/router/bill-task-router.ts`
- Create: `packages/bill-processing-os/src/router/intent-classifier.ts`
- Create: `packages/bill-processing-os/src/router/context-builder.ts`
- Create: `packages/bill-processing-os/tests/router.test.ts`

- [ ] Parse `user_intent`, file count, and optional prior-run context into one of the six execution modes.
- [ ] Build a normalized task context containing target Excel info, existing template set, and retry/repair metadata.
- [ ] Return a stable router output contract for downstream pipelines.

## Task 4: Implement type matching and template index

**Files:**
- Create: `packages/bill-processing-os/src/type-match/bill-type-matcher.ts`
- Create: `packages/bill-processing-os/src/type-match/similarity-engine.ts`
- Create: `packages/bill-processing-os/src/type-match/template-index.ts`
- Create: `packages/bill-processing-os/tests/type-match.test.ts`

- [ ] Load template features and score candidate types using keywords, table headers, and text similarity.
- [ ] Return ranked template candidates plus `type_match` score.
- [ ] Route low-score documents into `TYPE_ONBOARDING`.
- [ ] Test confident hit, near-match ambiguity, and unknown-type cases.

## Task 5: Implement parsing pipeline with preprocess, markdown, OCR, and handwriting signals

**Files:**
- Create: `packages/bill-processing-os/src/parse/preprocess.ts`
- Create: `packages/bill-processing-os/src/parse/markdown-adapter.ts`
- Create: `packages/bill-processing-os/src/parse/ocr-adapter.ts`
- Create: `packages/bill-processing-os/src/parse/handwriting-detector.ts`
- Create: `packages/bill-processing-os/src/parse/bill-parse-pipeline.ts`
- Create: `packages/bill-processing-os/tests/parse.test.ts`
- Create: `packages/bill-processing-os/tests/fixtures/`

- [ ] Detect input kind: image, text PDF, scanned PDF.
- [ ] Produce `raw.markdown`, `raw.ocr_text`, `image_meta`, and handwriting annotations.
- [ ] Set complexity flags for clean print, mixed handwriting, override candidates, and uncertain documents.
- [ ] Save raw artifacts for replay.

## Task 6: Implement extraction, fusion, and normalization pipeline

**Files:**
- Create: `packages/bill-processing-os/src/extract/llm-extractor.ts`
- Create: `packages/bill-processing-os/src/extract/field-fusion.ts`
- Create: `packages/bill-processing-os/src/extract/normalizer.ts`
- Create: `packages/bill-processing-os/src/extract/bill-extraction-pipeline.ts`
- Create: `packages/bill-processing-os/tests/extract.test.ts`

- [ ] Extract header fields and line items into `parsed`.
- [ ] Fuse OCR, markdown, and template priors into field-level candidate values.
- [ ] Normalize dates, currencies, quantities, amounts, and row schemas into `normalized`.
- [ ] Test clean printed, mixed handwriting, and missing-field fixtures.

## Task 7: Implement validation, confidence policy, dedupe, and routing

**Files:**
- Create: `packages/bill-processing-os/src/validate/validation-engine.ts`
- Create: `packages/bill-processing-os/src/validate/confidence-policy.ts`
- Create: `packages/bill-processing-os/src/validate/dedupe-guard.ts`
- Create: `packages/bill-processing-os/src/validate/routing-engine.ts`
- Create: `packages/bill-processing-os/src/validate/bill-validation-pipeline.ts`
- Create: `packages/bill-processing-os/tests/validate.test.ts`

- [ ] Validate required fields, row totals, and template-specific post rules.
- [ ] Apply the fixed confidence policy and handwriting/conflict overrides.
- [ ] Detect duplicates with `doc_hash + total_amount + date`.
- [ ] Route each document into `AUTO_WRITE`, `USER_CONFIRM`, `REVIEW_REQUIRED`, `TYPE_ONBOARDING`, or `REJECTED`.

## Task 8: Implement Excel writer and execution modes for new entry, repair, backfill, and batch

**Files:**
- Create: `packages/bill-processing-os/src/write/bill-excel-writer.ts`
- Create: `packages/bill-processing-os/src/write/excel-template-loader.ts`
- Create: `packages/bill-processing-os/src/write/row-expander.ts`
- Create: `packages/bill-processing-os/tests/write.test.ts`

- [ ] Support fixed-cell mapping and `expand_items` row expansion.
- [ ] Support append mode and controlled overwrite mode for `repair`.
- [ ] Record write batch metadata: workbook, sheet, start row, written cells, status.
- [ ] Test single-document write, multi-item expansion, and repair overwrite.

## Task 9: Implement review processor and correction merge

**Files:**
- Create: `packages/bill-processing-os/src/review/bill-review-processor.ts`
- Create: `packages/bill-processing-os/src/review/review-reason.ts`
- Create: `packages/bill-processing-os/src/review/correction-merge.ts`
- Create: `packages/bill-processing-os/tests/review.test.ts`

- [ ] Generate review tasks with field evidence and conflict details.
- [ ] Accept manual corrections and merge them back into `BillDocument.normalized`.
- [ ] Re-run validation after correction.
- [ ] Keep a correction audit trail for later template learning.

## Task 10: Implement template builder and onboarding flow

**Files:**
- Create: `packages/bill-processing-os/src/template/bill-template-builder.ts`
- Create: `packages/bill-processing-os/src/template/template-repository.ts`
- Create: `packages/bill-processing-os/src/template/template-versioning.ts`
- Create: `packages/bill-processing-os/tests/template.test.ts`

- [ ] Build a new template from confirmed normalized output and observed layout features.
- [ ] Version templates instead of mutating them in place.
- [ ] Link new templates to Excel mappings.
- [ ] Test new-type onboarding and second-pass template hit for the same type.

## Task 11: Wire the end-to-end CLI pipeline

**Files:**
- Create: `packages/bill-processing-os/src/cli.ts`
- Create: `packages/bill-processing-os/src/pipeline.ts`
- Create: `packages/bill-processing-os/src/reflection/reflection-engine.ts`
- Create: `packages/bill-processing-os/tests/reflection.test.ts`
- Create: `packages/bill-processing-os/tests/pipeline.integration.test.ts`

- [ ] Orchestrate router -> type match -> parse -> extract -> validate -> write/review/template flows.
- [ ] Insert a reflection step between extraction and validation to auto-fill safe derived totals and block risky inconsistencies.
- [ ] Support single file and batch directory input.
- [ ] Make failures isolated per document while preserving batch summary output.
- [ ] Emit a final task summary with counts for written, review, onboarding, rejected, and duplicate documents.

## Task 12: Create OpenClaw Skill distribution package and usage docs

**Files:**
- Create: `skills/bill-processing-os-openclaw/SKILL.md`
- Create: `skills/bill-processing-os-openclaw/INSTALL.md`
- Create: `skills/bill-processing-os-openclaw/agents/openai.yaml`
- Create: `skills/bill-processing-os-openclaw/references/runtime.md`
- Create: `skills/bill-processing-os-openclaw/scripts/setup.sh`
- Create: `skills/bill-processing-os-openclaw/scripts/run.sh`
- Create: `skills/bill-processing-os-openclaw/runtime/`
- Modify: `README.md`

- [ ] Expose a single user-facing OpenClaw Skill entry that wraps the workflow runtime.
- [ ] Add install and run scripts following the existing OpenClaw delivery pattern in this repository.
- [ ] Document required inputs, task modes, review flow, artifact locations, and customer-side runtime expectations.
- [ ] Document the first-iteration boundary and the template-learning loop.

## Suggested Agent Split

To parallelize safely, split work by disjoint ownership:

- Agent A: `domain/`, `storage/`, `router/`
- Agent B: `type-match/`, `template/`
- Agent C: `parse/`
- Agent D: `extract/`, `validate/`
- Agent E: `write/`, `review/`, `cli/`, docs integration

## Verification Gate

Before calling the implementation complete:

- Run package unit tests
- Run fixture-based parse/extract tests
- Run at least one end-to-end sample through CLI
- Verify replay artifacts are written to the run directory
- Verify one reviewed document can be corrected and revalidated
- Verify one new type can be onboarded and matched on a second run
