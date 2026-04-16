# Runtime Notes

## What the runtime writes

The runtime writes one spreadsheet row per call with these columns:

1. `日期`
2. `客户名`
3. `电话`
4. `客户类别`
5. `需求`
6. `对接阶段`
7. `打电话录音脑图`

The last column stores the Feishu detail document URL.

## Typical invocation

```bash
SKILL_DIR="$PWD/skills/customer-call-analyzer-openclaw"
bash "$SKILL_DIR/scripts/run.sh" --audio "/absolute/path/to/call.m4a"
```

## Existing spreadsheet

```bash
SKILL_DIR="$PWD/skills/customer-call-analyzer-openclaw"
bash "$SKILL_DIR/scripts/run.sh" \
  --audio "/absolute/path/to/call.m4a" \
  --sheet-url "https://your-domain.feishu.cn/sheets/xxxx"
```

## JSON output

```bash
SKILL_DIR="$PWD/skills/customer-call-analyzer-openclaw"
bash "$SKILL_DIR/scripts/run.sh" --audio "/absolute/path/to/call.m4a" --json
```
