# create-demand-doc

## Goal

Generate the customer-facing demand document from the joint perspective of a requirements analyst and a solution architect, then create the matching Feishu document.

## Inputs

- `transcript.txt`
- `analysis.json`

## Outputs

- `demand.md`
- `demand-doc.json`

Recommended metadata shape:

```json
{
  "doc_url": "https://www.feishu.cn/docx/xxxx"
}
```

## Constraints

- Follow the demand-document structure and tone rules from `PROMPT.md`
- Use `analysis.json` as the source of normalized facts
- Use `transcript.txt` for supporting detail and conservative inference
- Write from two combined roles:
  - requirements analyst
    - identify the real business problem, target outcome, scope boundary, priorities, and open questions
  - solution architect
    - judge complexity, propose the right-sized architecture, and define technical boundaries and phased delivery
- Before writing the document, explicitly infer the demand complexity from the recording content
- Use the L1 / L2 / L3 examples and signals in `PROMPT.md` as the default calibration reference
- Keep the architecture proportional to the inferred complexity
- For light requirements, prefer lightweight tool or MVP design rather than full platform architecture
- For medium or high-complexity requirements, explain which signals justify the added architecture depth
- Explicitly mark assumptions or recommendations when the call did not fully specify a point
- Create the Feishu document through `scripts/create_markdown_doc.sh`
- Title should follow: `客户名-行业-需求文档-日期`

## Failure policy

- If the content is uncertain, stay conservative rather than over-specifying requirements or inflating complexity
- If Feishu document creation fails, stop the workflow after keeping the local `demand.md`
