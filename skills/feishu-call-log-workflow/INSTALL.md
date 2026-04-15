# Install

## Recommended

Install this skill into OpenClaw global skills as a symlink:

```bash
SKILL_DIR="$PWD/skills/feishu-call-log-workflow"
bash "$SKILL_DIR/scripts/install-global.sh"
```

This keeps the source in the repository while exposing it globally to OpenClaw.

For teammates, the recommended rollout is:

1. Clone this repository
2. Run the global install command above
3. Run `scripts/setup.sh` once
4. Complete Feishu authorization on first actual write

## Verify

```bash
ls -la ~/.openclaw/workspace/skills/feishu-call-log-workflow
```

## Uninstall

```bash
SKILL_DIR="$PWD/skills/feishu-call-log-workflow"
bash "$SKILL_DIR/scripts/uninstall-global.sh"
```

## First run

```bash
SKILL_DIR="$PWD/skills/feishu-call-log-workflow"
bash "$SKILL_DIR/scripts/setup.sh"
```

## State

Default spreadsheet configuration is stored outside the repository:

```text
~/.openclaw/skill-state/feishu-call-log-workflow/config.json
```

That means:

- global installation does not dirty the repo
- replacing the default spreadsheet is persistent
- multiple future workflow steps can reuse the same state
- future extensions and added skills can share one stable workflow state directory

## Extend the workflow

Normal workflow nodes are documented in:

- `stages/README.md`

Optional inserted capabilities are documented in:

- `extensions/README.md`

That split is intentional:

- `stages` are the main execution path
- `extensions` are optional add-ons such as agent enrichers, sync jobs, or downstream workflows
