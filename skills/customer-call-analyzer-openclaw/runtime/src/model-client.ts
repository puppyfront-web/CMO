import fs from "node:fs/promises";
import path from "node:path";

import { normalizeAnalysisRecord } from "./extraction.js";
import type { AnalysisRecord, ProviderSettings } from "./types.js";

export async function transcribeAudio(
  audioPath: string,
  settings: ProviderSettings,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const buffer = await fs.readFile(audioPath);
  const file = new File([buffer], path.basename(audioPath), {
    type: guessMimeType(audioPath)
  });
  const formData = new FormData();
  formData.set("model", settings.transcribeModel);
  formData.set("file", file);

  const response = await fetchImpl(`${settings.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Transcription request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const transcript =
    (typeof payload.text === "string" && payload.text) ||
    (typeof payload.transcript === "string" && payload.transcript) ||
    "";

  if (!transcript) {
    throw new Error("Transcription response did not contain text.");
  }

  return transcript;
}

export async function extractAnalysis(
  transcript: string,
  settings: ProviderSettings,
  today: string,
  fetchImpl: typeof fetch = fetch
): Promise<AnalysisRecord> {
  const response = await fetchImpl(`${settings.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.extractModel,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You analyze Chinese customer call transcripts. Return JSON only with fields: date, customerName, phone, customerCategory, needs, engagementStage, summary, nextActions, risks, mindmap. The mindmap field must be a nested array or object tree suitable for rendering as an outline."
        },
        {
          role: "user",
          content: `Today's date is ${today}. Analyze this customer call transcript and fill missing fields conservatively.\n\n${transcript}`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Extraction request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const content = extractMessageContent(payload);

  if (!content) {
    throw new Error("Extraction response did not contain model output.");
  }

  return normalizeAnalysisRecord(content, today);
}

function extractMessageContent(payload: Record<string, unknown>): unknown {
  const choices = payload.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = choices[0] as { message?: { content?: unknown } };
    return message.message?.content;
  }

  const outputText = payload.output_text;
  if (typeof outputText === "string") {
    return outputText;
  }

  return undefined;
}

function guessMimeType(audioPath: string): string {
  const extension = path.extname(audioPath).toLowerCase();

  switch (extension) {
    case ".m4a":
      return "audio/mp4";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".aac":
      return "audio/aac";
    case ".ogg":
      return "audio/ogg";
    default:
      return "application/octet-stream";
  }
}
