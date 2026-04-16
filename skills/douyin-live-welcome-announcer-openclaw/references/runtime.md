# Runtime

The OpenClaw skill bundles its own runtime under `runtime/`.

## Setup

```bash
SKILL_DIR="$PWD/skills/douyin-live-welcome-announcer-openclaw"
bash "$SKILL_DIR/scripts/setup.sh"
```

This installs:

- Node dependencies with `npm install`
- Playwright Chromium with `npx playwright install chromium`
- A skill-local Python virtual environment at `runtime/.venv-edge-tts`
- `edge-tts` inside that virtual environment

## Run

```bash
SKILL_DIR="$PWD/skills/douyin-live-welcome-announcer-openclaw"
bash "$SKILL_DIR/scripts/run.sh" "https://your-live-room-url"
```

The live-room URL is required. The runtime will not start without it.

Gift detection listens to Douyin's webcast push WebSocket frames instead of scraping gift text from the DOM, so the live-room tab can stay visually unchanged while gifts are still announced.

Comment analysis is stored per live run under `~/.douyin-live-welcome/sessions/`. Each session includes raw events plus generated `users.json`, `leads.json`, and `report.md` outputs after the watcher stops.

Optional environment variables:

- `DOUYIN_TTS_ENGINE`: `auto` | `edge` | `say`
- `DOUYIN_EDGE_VOICE`: default `zh-CN-XiaoxiaoNeural`
- `DOUYIN_SAY_VOICE`: default `Tingting`
- `DOUYIN_TEMPLATE`: default `感谢{nickname}送的{gift}，比心`

## Voice selection

Before choosing an Edge voice, users can preview available voices at:

- [tts.wangwangit.com](http://tts.wangwangit.com/)

After choosing a preferred Edge voice, pass it through `DOUYIN_EDGE_VOICE` or `--edge-voice`.

## Fallback

When `DOUYIN_TTS_ENGINE=auto`, the runtime tries `edge-tts` first and falls back to macOS `say` if synthesis fails. The fallback uses the system default audio output device.

## Smoke test

```bash
SKILL_DIR="$PWD/skills/douyin-live-welcome-announcer-openclaw"
cd "$SKILL_DIR/runtime"
npm run smoke:fixture
```

This smoke test only verifies the local DOM observer path with a fixture page. Real gift detection is covered by the runtime test suite.
