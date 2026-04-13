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

Optional environment variables:

- `DOUYIN_TTS_ENGINE`: `auto` | `edge` | `say`
- `DOUYIN_EDGE_VOICE`: default `zh-CN-XiaoxiaoNeural`
- `DOUYIN_SAY_VOICE`: default `Tingting`
- `DOUYIN_TEMPLATE`: default `欢迎 {nickname} 来到直播间`

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
