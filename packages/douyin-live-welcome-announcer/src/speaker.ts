import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export interface SpeakerOptions {
  dryRun?: boolean;
  engine?: "auto" | "say" | "edge";
  sayVoice?: string;
  edgeVoice?: string;
  edgeRate?: string;
  edgePitch?: string;
  edgeVolume?: string;
  logger?: (message: string) => void;
}

export interface EdgeTtsArgsOptions {
  text: string;
  voice: string;
  rate: string;
  pitch: string;
  volume: string;
  outputFile: string;
}

export function buildSayArgs(text: string, voice?: string): string[] {
  const args: string[] = [];

  if (voice) {
    args.push("-v", voice);
  }

  args.push(text);
  return args;
}

export function buildEdgeTtsArgs(options: EdgeTtsArgsOptions): string[] {
  return [
    "-m",
    "edge_tts",
    "--text",
    options.text,
    "--voice",
    options.voice,
    "--rate",
    options.rate,
    "--pitch",
    options.pitch,
    "--volume",
    options.volume,
    "--write-media",
    options.outputFile
  ];
}

export function buildPowerShellArgs(script: string): string[] {
  return ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script];
}

export function buildWindowsSpeechScript(text: string, voice?: string): string {
  const escapedText = escapePowerShellSingleQuotedString(text);
  const escapedVoice = voice ? escapePowerShellSingleQuotedString(voice) : "";

  return [
    "Add-Type -AssemblyName System.Speech",
    "$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    voice
      ? `try { $speaker.SelectVoice('${escapedVoice}') } catch { }`
      : "$null = $speaker.Voice",
    `$speaker.Speak('${escapedText}')`,
    "$speaker.Dispose()"
  ].join("; ");
}

export function buildWindowsMediaPlayerScript(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/gu, "/");
  const uriPath = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
  const fileUri = `file://${uriPath}`;
  const escapedUri = escapePowerShellSingleQuotedString(fileUri);

  return [
    "Add-Type -AssemblyName PresentationCore",
    "$player = New-Object System.Windows.Media.MediaPlayer",
    `$player.Open([Uri]'${escapedUri}')`,
    "$player.Volume = 1.0",
    "$player.Play()",
    "while (-not $player.NaturalDuration.HasTimeSpan) { Start-Sleep -Milliseconds 100 }",
    "Start-Sleep -Milliseconds ([Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalMilliseconds) + 200)",
    "$player.Close()"
  ].join("; ");
}

export function resolveEdgeTtsPythonCommand(): string {
  const explicit = process.env.EDGE_TTS_PYTHON?.trim();
  if (explicit) {
    return explicit;
  }

  const localPython3 = path.resolve(".venv-edge-tts/bin/python3");
  if (existsSync(localPython3)) {
    return localPython3;
  }

  const localPython = path.resolve(".venv-edge-tts/bin/python");
  if (existsSync(localPython)) {
    return localPython;
  }

  const windowsPython = path.resolve(".venv-edge-tts/Scripts/python.exe");
  if (existsSync(windowsPython)) {
    return windowsPython;
  }

  return "python3";
}

export class SpeakerQueue {
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly options: SpeakerOptions = {}) {}

  speak(text: string): Promise<void> {
    this.tail = this.tail.then(() => this.run(text));
    return this.tail;
  }

  waitForIdle(): Promise<void> {
    return this.tail;
  }

  private run(text: string): Promise<void> {
    if (this.options.dryRun) {
      this.options.logger?.(`[dry-run] ${text}`);
      return Promise.resolve();
    }

    if (this.options.engine === "say") {
      return this.runSay(text);
    }

    if (this.options.engine === "edge") {
      return this.runEdge(text);
    }

    return this.runEdge(text).catch((error) => {
      this.options.logger?.(`edge-tts 失败，回退 say：${String(error)}`);
      return this.runSay(text);
    });
  }

  private runSay(text: string): Promise<void> {
    if (process.platform === "win32") {
      return this.spawnProcess("powershell.exe", buildPowerShellArgs(buildWindowsSpeechScript(text, this.options.sayVoice)));
    }

    return new Promise((resolve, reject) => {
      const child = spawn("/usr/bin/say", buildSayArgs(text, this.options.sayVoice), {
        stdio: "ignore"
      });

      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`say exited with code ${code ?? "unknown"}`));
      });
    });
  }

  private async runEdge(text: string): Promise<void> {
    const outputFile = path.join(os.tmpdir(), `douyin-live-welcome-${randomUUID()}.mp3`);

    try {
      await this.spawnProcess(
        resolveEdgeTtsPythonCommand(),
        buildEdgeTtsArgs({
          text,
          voice: this.options.edgeVoice ?? "zh-CN-XiaoxiaoNeural",
          rate: this.options.edgeRate ?? "+10%",
          pitch: this.options.edgePitch ?? "+0Hz",
          volume: this.options.edgeVolume ?? "+0%",
          outputFile
        })
      );

      if (process.platform === "win32") {
        await this.spawnProcess(
          "powershell.exe",
          buildPowerShellArgs(buildWindowsMediaPlayerScript(outputFile))
        );
      } else {
        await this.spawnProcess("/usr/bin/afplay", [outputFile]);
      }
    } finally {
      await rm(outputFile, { force: true });
    }
  }

  private spawnProcess(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: "ignore"
      });

      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
      });
    });
  }
}

function escapePowerShellSingleQuotedString(value: string): string {
  return value.replace(/'/gu, "''");
}
