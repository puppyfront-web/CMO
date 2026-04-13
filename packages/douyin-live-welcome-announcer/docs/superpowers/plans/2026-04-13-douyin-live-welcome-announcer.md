# Douyin Live Welcome Announcer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local macOS tool that watches the Douyin web live room/backend for new audience entry messages and speaks welcome lines through the system speaker with minimal setup.

**Architecture:** Use a headful persistent Playwright Chromium session to open the Douyin live page, inject a mutation observer that detects newly added welcome text, normalize nicknames, deduplicate rapid repeats, and feed a serialized TTS queue backed by the macOS `say` command. Package the tool with a personal Codex skill that installs dependencies, launches the watcher, and only asks the user to log in when required.

**Tech Stack:** Node.js 20, TypeScript, Playwright, Vitest, macOS `say`

---

### Task 1: Project bootstrap

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Write the failing test**

Bootstrap has no meaningful runtime behavior to test; use Tasks 2-4 for TDD coverage.

- [ ] **Step 2: Create package metadata**

Define scripts for `build`, `dev`, `watch`, `test`, and `smoke:fixture`.

- [ ] **Step 3: Add TypeScript config**

Compile `src/**/*.ts` to `dist/`.

- [ ] **Step 4: Add ignore rules**

Ignore `node_modules`, `dist`, Playwright state, and logs.

### Task 2: Welcome text parsing and dedupe

**Files:**
- Create: `src/nickname.ts`
- Create: `src/dedupe.ts`
- Test: `tests/nickname.test.ts`
- Test: `tests/dedupe.test.ts`

- [ ] **Step 1: Write the failing tests**

Cover extracting nicknames from common entry text, rejecting noise, and suppressing duplicates inside a short window.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/nickname.test.ts tests/dedupe.test.ts`

- [ ] **Step 3: Write minimal implementation**

Add normalization, regex-based extraction, and TTL-based dedupe.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/nickname.test.ts tests/dedupe.test.ts`

### Task 3: Browser watcher and fixture integration

**Files:**
- Create: `src/observer-script.ts`
- Create: `src/watcher.ts`
- Create: `tests/fixtures/live-room.html`
- Test: `tests/watcher-fixture.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

Use a local fixture page that appends `某某进入了直播间` messages after load and assert the watcher receives normalized nickname events.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/watcher-fixture.integration.test.ts`

- [ ] **Step 3: Write minimal implementation**

Launch Chromium, inject the observer, bridge events to Node, and close cleanly after capture.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/watcher-fixture.integration.test.ts`

### Task 4: CLI runner and speech queue

**Files:**
- Create: `src/speaker.ts`
- Create: `src/config.ts`
- Create: `src/cli.ts`

- [ ] **Step 1: Write the failing tests**

Add tests for welcome template rendering and dry-run queue behavior if needed.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

- [ ] **Step 3: Write minimal implementation**

Parse CLI flags, start watcher, enqueue speech, expose pause/resume commands, and support `--dry-run`.

- [ ] **Step 4: Run tests to verify it passes**

Run: `npm test`

### Task 5: Personal skill packaging

**Files:**
- Create: `/Users/tutu/.agents/skills/douyin-live-welcome-announcer/SKILL.md`
- Create: `/Users/tutu/.agents/skills/douyin-live-welcome-announcer/agents/openai.yaml`
- Create: `/Users/tutu/.agents/skills/douyin-live-welcome-announcer/references/runtime.md`

- [ ] **Step 1: Write the skill docs**

Describe when to invoke the skill, how to install dependencies, how to launch the watcher, and when to ask the user to log in.

- [ ] **Step 2: Validate skill metadata**

Ensure `default_prompt` mentions `$douyin-live-welcome-announcer`.

### Task 6: Verification

**Files:**
- Modify: `README-style guidance is intentionally kept inside the skill/reference files only`

- [ ] **Step 1: Install runtime dependencies**

Run: `npm install`

- [ ] **Step 2: Install Playwright Chromium**

Run: `npx playwright install chromium`

- [ ] **Step 3: Run automated verification**

Run: `npm test && npm run build`

- [ ] **Step 4: Run fixture smoke test**

Run: `npm run smoke:fixture`
