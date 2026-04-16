# resolve-sheet

## Goal

Resolve the spreadsheet target for this run without changing the saved default unless the user explicitly asked to replace it.

## Inputs

- user intent about spreadsheet reuse or replacement
- saved state from `scripts/state.py`

## Outputs

- `sheet-target.json`

Recommended shape:

```json
{
  "sheetUrl": "https://your.feishu.cn/sheets/xxxx",
  "source": "saved-default",
  "reusedSavedDefault": true
}
```

## Constraints

- Reuse the saved default silently when it exists and the user did not ask to switch
- Only replace the saved default when the user explicitly asked to change/replace the sheet URL
- If no saved default exists, prefer a user-provided sheet URL
- If no sheet URL is provided, create a new spreadsheet and save it as the default
- Do not perform transcript or document generation in this stage

## Failure policy

- If spreadsheet creation fails, stop the workflow here
- Do not fabricate a sheet URL
