# create-mindmap-doc

## Goal

Create the Feishu pure mind-map document from `mindmap.mmd` and capture its document metadata.

## Inputs

- `mindmap.mmd`
- `analysis.json`

## Outputs

- `mindmap-doc.json`

Recommended shape:

```json
{
  "doc_url": "https://www.feishu.cn/docx/xxxx",
  "board_token": "xxxx"
}
```

## Constraints

- Use `scripts/create_mindmap_doc.sh`
- Title should follow the mind-map naming rule: `客户名-行业-日期`
- The document body should stay a pure mind-map
- Do not write spreadsheet rows in this stage

## Failure policy

- If Feishu document creation fails, stop the workflow
- Do not substitute a local file path where a Feishu doc URL is required
