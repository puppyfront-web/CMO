# create-quotation-sheet

## Goal

Generate the quotation spreadsheet data from the normalized call understanding and the completed demand document, then create the matching Feishu spreadsheet.

## Inputs

- `analysis.json`
- `demand.md`

## Outputs

- `quotation-sheet-data.json`
- `quotation-sheet.json`

Recommended metadata shape:

```json
{
  "sheet_url": "https://your.feishu.cn/sheets/xxxx"
}
```

## Constraints

- Follow the pricing calibration and quotation structure in `PROMPT.md`
- Base pricing on the actual complexity inferred from `analysis.json` and the scope clarified in `demand.md`
- Use the demand document as the analyzed output of a requirements analyst plus solution architect, not as a generic summary
- Use the L1 / L2 / L3 examples and recording signals in `PROMPT.md` as the default pricing calibration reference
- Price according to the actual likely delivery shape inferred from the recording:
  - lightweight tool / MVP
  - standard business system
  - deep custom platform
- Keep pricing close to realistic成交 expectations for the inferred scenario
- Do not price a lightweight scenario like a platform implementation
- Only move into higher price bands when the recording or demand document clearly shows higher complexity signals
- Keep the three-tier output: `基础版 / 高级版 / 旗舰版`
- Use RMB pricing
- Output a JSON 2D array suitable for direct spreadsheet creation
- Do not generate a long-form quotation explanation document
- Create the Feishu spreadsheet through `scripts/create_quotation_sheet.sh`
- Title should follow: `客户名-行业-报价表-日期`

## Failure policy

- If information is incomplete, provide justified range pricing instead of fabricated certainty
- If the complexity cannot be proven from the recording, default to the lower credible complexity tier
- If spreadsheet creation fails, stop the workflow after keeping the local `quotation-sheet-data.json`
