# extract-fields

## Goal

Read `transcript.txt` and produce one normalized `analysis.json` object for the fixed spreadsheet schema.

## Inputs

- `transcript.txt`

## Outputs

- `analysis.json`

Recommended keys:

- `日期`
- `客户名`
- `电话`
- `客户类别`
- `需求`
- `对接阶段`
- `备注`
- optional helper fields such as `行业`

## Constraints

- Follow the global rules in `PROMPT.md`
- Every required field must be present in the output object
- If a required field is missing, use `未提取到`
- `备注` only stores important supplementary information such as risks, constraints, objections, or explicit next steps
- Do not generate mindmap, demand, or quotation content in this stage
- Keep the output concise and structured for machine consumption

## Failure policy

- If the transcript is too poor to support confident extraction, still return the full schema with conservative fallback values
- Do not leave required keys absent
