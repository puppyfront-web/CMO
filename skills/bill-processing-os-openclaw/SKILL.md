---
name: bill_processing_os
description: Use when an OpenClaw user wants bill documents or bill images routed through a local workflow that parses, extracts, validates, reviews, learns types, and computes Excel-ready workbook writes.
metadata: {"openclaw":{"skillKey":"bill_processing_os","emoji":"🧾","requires":{"bins":["node","npm"],"os":["darwin","linux"]}}}
---

# Bill Processing OS

This OpenClaw skill packages a local-first bill processing workflow for prepared bill input bundles and bill images. It classifies execution mode, matches known bill types, parses source artifacts, extracts normalized fields and line items, validates routing decisions, creates review/onboarding outputs, and computes workbook writes for downstream Excel persistence.

## Use this skill when

- The user has one or more prepared bill source files or bill images.
- The user wants a deterministic local workflow with replay artifacts and review/onboarding outputs.
- The user wants OpenClaw to call a single Skill entry instead of manually stitching parser, validator, and writer steps.

## First-iteration boundary

- Input supports JSON, Markdown, plain-text, image, and PDF source files.
- The runtime can persist a physical `.xlsx` file when `--excel-out` is supplied.
- Raw image/PDF inputs need an OCR provider. On macOS, the included `scripts/ocr-macos-vision.sh` can be used directly. On Linux, pass your own OCR executable through `--ocr-command`.

## Execution rules

- Prefer the workspace-local copy at `<workspace>/skills/bill-processing-os-openclaw`.
- Use the included scripts directly.
- Pass a JSON, Markdown, plain-text, image, or PDF bill file, or a directory containing supported files.
- Pass at least one `--template-bundle` file when you want the workflow to write into Excel automatically.
- Pass `--ocr-command <executable>` when the input is an image or scanned PDF and you want the workflow to extract text before routing.
- Expect replay artifacts under `~/.bill-processing-os/runs/`.

## Standard flow

1. Bootstrap the skill runtime:

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
bash "$SKILL_DIR/scripts/setup.sh"
```

2. Run a single prepared bill source file:

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
bash "$SKILL_DIR/scripts/run.sh" "/absolute/path/to/bill.md" \
  --template-bundle "$SKILL_DIR/examples/fabric-sales-template.bundle.json" \
  --excel-out "/absolute/path/to/result.xlsx"
```

3. Run a bill image with the built-in macOS OCR provider:

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
bash "$SKILL_DIR/scripts/run.sh" "/absolute/path/to/bill.jpg" \
  --template-bundle "$SKILL_DIR/examples/yubo-fabric-ticket-template.bundle.json" \
  --ocr-command "$SKILL_DIR/scripts/ocr-macos-vision.sh" \
  --excel-out "/absolute/path/to/result.xlsx"
```

4. Run a directory of prepared bill source files and print JSON:

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
BILL_JSON_OUTPUT=1 \
bash "$SKILL_DIR/scripts/run.sh" "/absolute/path/to/bill-inputs" \
  --template-bundle "$SKILL_DIR/examples/fabric-sales-template.bundle.json"
```

## Notes

- The workflow is `Single Skill Entry, Workflow Core, Agent-Assisted Nodes`.
- The runtime includes an internal reflection step that re-checks extracted totals and row math before write/review routing.
- Replay artifacts are written for each run so failures can be audited and reprocessed.
- New bill types can be onboarded through the workflow, but this first iteration keeps onboarding outputs local.
- OCR providers are executable contracts: they receive the image or PDF path as the first argument and must write plain-text transcript to stdout.

## References

- `references/runtime.md`
