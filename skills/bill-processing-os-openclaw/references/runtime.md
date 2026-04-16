# Runtime Notes

## What the runtime does

The runtime:

1. Routes the task mode
2. Loads prepared JSON / Markdown / plain-text bill source inputs, or image/PDF files when an OCR provider is supplied
3. Extracts normalized fields and line items
4. Runs a reflection pass to auto-fix safe derived totals and catch risky inconsistencies
5. Validates routing decisions
6. Computes workbook writes, review outputs, or onboarding outputs
7. Optionally writes a real `.xlsx` file when `--excel-out` is supplied
7. Writes replay artifacts under `~/.bill-processing-os/runs/`

## Typical invocation

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
bash "$SKILL_DIR/scripts/run.sh" "/absolute/path/to/bill.md" \
  --template-bundle "$SKILL_DIR/examples/fabric-sales-template.bundle.json" \
  --excel-out "/absolute/path/to/result.xlsx"
```

## Image invocation

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
bash "$SKILL_DIR/scripts/run.sh" "/absolute/path/to/bill.jpg" \
  --template-bundle "$SKILL_DIR/examples/yubo-fabric-ticket-template.bundle.json" \
  --ocr-command "$SKILL_DIR/scripts/ocr-macos-vision.sh" \
  --excel-out "/absolute/path/to/result.xlsx"
```

## Batch invocation

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
bash "$SKILL_DIR/scripts/run.sh" "/absolute/path/to/bill-inputs" \
  --template-bundle "$SKILL_DIR/examples/fabric-sales-template.bundle.json" \
  --excel-out "/absolute/path/to/result.xlsx"
```

## JSON output

```bash
SKILL_DIR="$PWD/skills/bill-processing-os-openclaw"
BILL_JSON_OUTPUT=1 \
bash "$SKILL_DIR/scripts/run.sh" "/absolute/path/to/bill-inputs" \
  --template-bundle "$SKILL_DIR/examples/fabric-sales-template.bundle.json"
```

## OCR command contract

The runtime does not hardcode one OCR engine. Instead, `--ocr-command` points to an executable that:

1. Receives the image or PDF path as its first argument
2. Writes plain-text transcript to stdout
3. Exits with a non-zero code on failure
