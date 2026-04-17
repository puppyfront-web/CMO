# Install

## Recommended

Install this workflow into OpenClaw global skills as a symlink:

```bash
SKILL_DIR="$PWD/skills/feishu-call-log-workflow"
bash "$SKILL_DIR/scripts/install-global.sh"
```

If you are installing from a distributed DSL bundle instead of a checked-out repo:

```bash
python3 scripts/install-openclaw-dsl.py dist/openclaw/feishu-call-log-workflow-0.1.0.dsl.tgz
```

Then prepare the local helper environment:

```bash
SKILL_DIR="$HOME/.openclaw/workspace/skills/feishu-call-log-workflow"
bash "$SKILL_DIR/scripts/setup.sh"
```

## Verify

```bash
ls -la ~/.openclaw/workspace/skills/feishu-call-log-workflow
```

## Uninstall

```bash
SKILL_DIR="$HOME/.openclaw/workspace/skills/feishu-call-log-workflow"
bash "$SKILL_DIR/scripts/uninstall-global.sh"
```

## State

Default spreadsheet configuration is stored outside the repository:

```text
~/.openclaw/skill-state/feishu-call-log-workflow/config.json
```

## Outputs

Each run may create:

- one mind-map document
- one demand document
- one quotation spreadsheet
- one spreadsheet row
