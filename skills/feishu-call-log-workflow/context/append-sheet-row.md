# append-sheet-row

## Goal

Assemble the final 10-column spreadsheet row and append it to the resolved Feishu spreadsheet.

## Inputs

- `sheet-target.json`
- `analysis.json`
- `mindmap-doc.json`
- `demand-doc.json`
- `quotation-sheet.json`

## Outputs

- `sheet-row.json`
- `feishu-sheet.json`

Recommended row order:

1. `日期`
2. `客户名`
3. `电话`
4. `客户类别`
5. `需求`
6. `对接阶段`
7. `打电话录音脑图`
8. `备注`
9. `需求文档`
10. `报价表`

## Constraints

- The row order must exactly match the spreadsheet schema
- `打电话录音脑图` stores only the mind-map Feishu document URL
- `需求文档` stores only the demand-document Feishu URL
- `报价表` stores only the quotation spreadsheet URL
- `备注` stores concise extra findings only
- Use `scripts/append_sheet_row.sh`
- Fail fast if any required document URL is missing

## Failure policy

- Do not append a partial row
- Do not shift columns to compensate for missing values
