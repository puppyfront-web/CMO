import { describe, expect, test } from "vitest";

import {
  buildEdgeTtsArgs,
  buildPowerShellArgs,
  buildSayArgs,
  SpeakerQueue,
  buildWindowsMediaPlayerScript,
  buildWindowsSpeechScript
} from "../src/speaker.js";

describe("buildSayArgs", () => {
  test("passes voice and text to say", () => {
    expect(buildSayArgs("欢迎测试用户", "Tingting")).toEqual(["-v", "Tingting", "欢迎测试用户"]);
  });
});

describe("buildEdgeTtsArgs", () => {
  test("creates edge-tts cli args with media target", () => {
    expect(
      buildEdgeTtsArgs({
        text: "欢迎测试用户",
        voice: "zh-CN-XiaoxiaoNeural",
        rate: "+10%",
        pitch: "+0Hz",
        volume: "+0%",
        outputFile: "/tmp/welcome.mp3"
      })
    ).toEqual([
      "-m",
      "edge_tts",
      "--text",
      "欢迎测试用户",
      "--voice",
      "zh-CN-XiaoxiaoNeural",
      "--rate",
      "+10%",
      "--pitch",
      "+0Hz",
      "--volume",
      "+0%",
      "--write-media",
      "/tmp/welcome.mp3"
    ]);
  });
});

describe("buildPowerShellArgs", () => {
  test("wraps a script for non-interactive powershell execution", () => {
    expect(buildPowerShellArgs("Write-Host 'ok'")).toEqual([
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Write-Host 'ok'"
    ]);
  });
});

describe("buildWindowsSpeechScript", () => {
  test("creates a System.Speech script and preserves default output device", () => {
    const script = buildWindowsSpeechScript("欢迎 小石头 7 3 3 3 7", "Microsoft Huihui Desktop");

    expect(script).toContain("System.Speech.Synthesis.SpeechSynthesizer");
    expect(script).toContain("SelectVoice");
    expect(script).toContain("欢迎 小石头 7 3 3 3 7");
  });
});

describe("buildWindowsMediaPlayerScript", () => {
  test("creates a MediaPlayer playback script for mp3 output", () => {
    const script = buildWindowsMediaPlayerScript("C:\\\\temp\\\\welcome.mp3");

    expect(script).toContain("PresentationCore");
    expect(script).toContain("MediaPlayer");
    expect(script).toContain("welcome.mp3");
  });
});

describe("SpeakerQueue.stop", () => {
  test("stops queued announcements that have not started yet", async () => {
    let resolveFirst!: () => void;
    const spoken: string[] = [];
    const queue = new SpeakerQueue({
      speakImpl: async (text) => {
        spoken.push(text);
        if (text === "first") {
          await new Promise<void>((resolve) => {
            resolveFirst = resolve;
          });
        }
      }
    });

    const first = queue.speak("first");
    const second = queue.speak("second");

    await expect
      .poll(() => spoken)
      .toEqual(["first"]);

    queue.stop();
    resolveFirst();

    await first;
    await second;

    expect(spoken).toEqual(["first"]);
  });
});
