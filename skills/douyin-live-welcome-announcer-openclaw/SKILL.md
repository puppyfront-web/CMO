---
name: douyin_live_welcome_announcer
description: Use when an OpenClaw user wants spoken nickname announcements for Douyin live-room gift senders on macOS or Windows, especially when monitoring the live room in a browser and needing natural TTS with digit-by-digit nickname reading.
metadata: {"openclaw":{"skillKey":"douyin_live_welcome_announcer","emoji":"🎙️","requires":{"bins":["node","npm","python3"],"os":["darwin","win32"]}}}
---

# Douyin Live Welcome Announcer

This skill packages a self-contained Douyin live-room watcher for OpenClaw users on macOS and Windows. It opens a Playwright-controlled Chromium page, detects gift messages such as `某某送出了礼物`, and speaks a nickname line with `edge-tts` first and the system local TTS as fallback.

Gift events are taken from Douyin's webcast push WebSocket frames, which is more stable than relying on transient DOM gift text.

## Use this skill when

- The user is live on Douyin and wants spoken nickname announcements only for viewers who send gifts.
- The user is on macOS or Windows and can keep a browser window open on the actual live room page.
- The user wants better TTS quality than plain system `say`.

## Execution rules

- Prefer the workspace-local copy at `<workspace>/skills/douyin-live-welcome-announcer-openclaw`.
- Run the included scripts directly; do not ask the user to manually type long setup commands unless a login step requires it.
- Require the user to provide the real live-room URL before launch; do not start from `https://live.douyin.com/` homepage content.
- Only ask the user to intervene for Douyin login and navigating the controlled browser to the real live room page.

## Standard flow

1. Resolve the skill directory and bootstrap the runtime:

```bash
SKILL_DIR="$PWD/skills/douyin-live-welcome-announcer-openclaw"
bash "$SKILL_DIR/scripts/setup.sh"
```

2. Start the announcer with the exact live-room URL:

```bash
SKILL_DIR="$PWD/skills/douyin-live-welcome-announcer-openclaw"
bash "$SKILL_DIR/scripts/run.sh" "https://live.douyin.com/你的直播间"
```

3. If the page leaves the provided live-room URL, the watcher will ignore events until it returns to that same room.

## Controls

- `p`: pause announcements
- `r`: resume announcements
- `s`: show paused/running state
- `q`: quit

## Notes

- For voice selection, recommend previewing voices on `http://tts.wangwangit.com/` first, then set `DOUYIN_EDGE_VOICE` or `--edge-voice` to the preferred Edge voice name.
- `edge-tts` is installed into a skill-local virtual environment under `runtime/.venv-edge-tts`.
- Nicknames with digits are spoken digit by digit. Example: `A9同学2026` becomes `A 9 同学 2 0 2 6`.
- If `edge-tts` fails, the runtime falls back to the local system TTS automatically and continues using the system default audio output device.
- The browser profile is stored under `~/.douyin-live-welcome/browser-profile` so login usually persists.

## References

- `references/runtime.md`
