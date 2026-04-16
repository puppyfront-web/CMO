# build-mindmap

## Goal

Generate Mermaid `mindmap` content that captures the call structure and key business points.

## Inputs

- `transcript.txt`
- `analysis.json`

## Outputs

- `mindmap.mmd`

## Constraints

- Output Mermaid `mindmap` syntax only
- The mindmap should reflect the call content, not generic sales boilerplate
- Use `analysis.json` to stabilize naming, customer identity, and key themes
- Do not add demand-document prose or quotation content here
- The resulting Feishu mind-map document should remain a pure mind-map with no extra narrative body

## Failure policy

- If the transcript is sparse, generate a minimal but valid mindmap
- Do not switch formats away from Mermaid
