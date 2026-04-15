import zlib from "node:zlib";

import { type GiftEvent, normalizeGiftName, normalizeNickname } from "./nickname.js";

interface ProtoField {
  fieldNumber: number;
  wireType: number;
  data?: Buffer;
}

export interface WebcastGiftEvent extends GiftEvent {
  summary: string;
}

const GIFT_MESSAGE_NAME = "WebcastGiftMessage";
const DOUYIN_WEBCAST_PUSH_PATH = "/webcast/im/push/v2/";

export function isDouyinWebcastPushSocketUrl(url: string): boolean {
  return url.includes(DOUYIN_WEBCAST_PUSH_PATH);
}

export function extractGiftEventFromWebcastFrame(payload: Buffer | string): WebcastGiftEvent | null {
  const message = findGiftMessage(maybeGunzipFrame(asBuffer(payload)));
  if (!message) {
    return null;
  }

  return extractGiftEventFromMessage(message);
}

function extractGiftEventFromMessage(message: Buffer): WebcastGiftEvent | null {
  const fields = tryParseProtoFields(message);
  if (!fields) {
    return null;
  }

  const summary = decodeTextField(fields, 7)?.replace(/\s+/gu, " ").trim() ?? "";
  const template = getLengthDelimitedField(fields, 8);
  if (!template) {
    return null;
  }

  const slotTexts = getTemplateSlotTexts(template);
  const gift = pickGiftName(slotTexts);
  const nickname = pickNickname(slotTexts, gift);

  if (!nickname || !gift) {
    return null;
  }

  return { nickname, gift, summary };
}

function getTemplateSlotTexts(template: Buffer): string[] {
  const fields = tryParseProtoFields(template);
  if (!fields) {
    return [];
  }

  return fields
    .filter((field) => field.fieldNumber === 4 && field.wireType === 2 && field.data)
    .map((field) => {
      const slotFields = tryParseProtoFields(field.data!);
      if (!slotFields) {
        return "";
      }

      return decodeTextField(slotFields, 11) ?? "";
    });
}

function pickGiftName(slotTexts: string[]): string | null {
  for (let index = slotTexts.length - 1; index >= 0; index -= 1) {
    const normalized = normalizeGiftName(slotTexts[index] ?? "");
    if (normalized && !/^\d+$/u.test(normalized)) {
      return normalized;
    }
  }

  return null;
}

function pickNickname(slotTexts: string[], gift: string | null): string | null {
  for (const text of slotTexts) {
    const normalized = normalizeNickname(text);
    if (!normalized || /^\d+$/u.test(normalized) || isGiftCountMarker(normalized)) {
      continue;
    }

    if (gift && normalizeGiftName(normalized) === gift) {
      continue;
    }

    return normalized;
  }

  return null;
}

function isGiftCountMarker(text: string): boolean {
  return /^x\s*\d+$/iu.test(text);
}

function findGiftMessage(buffer: Buffer, depth = 0): Buffer | null {
  if (depth > 6) {
    return null;
  }

  const fields = tryParseProtoFields(buffer);
  if (!fields) {
    return null;
  }

  if (decodeTextField(fields, 1) === GIFT_MESSAGE_NAME && decodeTextField(fields, 7)) {
    return buffer;
  }

  for (const field of fields) {
    if (field.wireType !== 2 || !field.data || field.data.length === 0) {
      continue;
    }

    const nested = findGiftMessage(field.data, depth + 1);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function maybeGunzipFrame(buffer: Buffer): Buffer {
  const gzipOffset = findGzipOffset(buffer);
  if (gzipOffset < 0) {
    return buffer;
  }

  try {
    return zlib.gunzipSync(buffer.subarray(gzipOffset));
  } catch {
    return buffer;
  }
}

function findGzipOffset(buffer: Buffer): number {
  for (let index = 0; index < buffer.length - 1; index += 1) {
    if (buffer[index] === 0x1f && buffer[index + 1] === 0x8b) {
      return index;
    }
  }

  return -1;
}

function asBuffer(payload: Buffer | string): Buffer {
  return Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload));
}

function decodeTextField(fields: ProtoField[], fieldNumber: number): string | null {
  const field = getLengthDelimitedField(fields, fieldNumber);
  if (!field) {
    return null;
  }

  return decodeUtf8Text(field);
}

function getLengthDelimitedField(fields: ProtoField[], fieldNumber: number): Buffer | null {
  for (const field of fields) {
    if (field.fieldNumber === fieldNumber && field.wireType === 2 && field.data) {
      return field.data;
    }
  }

  return null;
}

function decodeUtf8Text(buffer: Buffer): string | null {
  try {
    const text = buffer.toString("utf8");
    const printableRatio =
      [...text].filter((char) => char === "\n" || char === "\r" || char === "\t" || isPrintable(char)).length /
      Math.max(text.length, 1);

    return printableRatio >= 0.85 ? text : null;
  } catch {
    return null;
  }
}

function isPrintable(char: string): boolean {
  return char >= " " && char !== "\u007f";
}

function tryParseProtoFields(buffer: Buffer): ProtoField[] | null {
  try {
    return parseProtoFields(buffer);
  } catch {
    return null;
  }
}

function parseProtoFields(buffer: Buffer): ProtoField[] {
  const fields: ProtoField[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const [tag, nextOffset] = readVarint(buffer, offset);
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x07;
    offset = nextOffset;

    if (wireType === 0) {
      [, offset] = readVarint(buffer, offset);
      fields.push({ fieldNumber, wireType });
      continue;
    }

    if (wireType === 1) {
      offset += 8;
      if (offset > buffer.length) {
        throw new Error("Invalid fixed64 field");
      }
      fields.push({ fieldNumber, wireType });
      continue;
    }

    if (wireType === 2) {
      const [length, valueOffset] = readVarint(buffer, offset);
      const data = buffer.subarray(valueOffset, valueOffset + length);
      if (data.length !== length) {
        throw new Error("Invalid length-delimited field");
      }

      offset = valueOffset + length;
      fields.push({ fieldNumber, wireType, data });
      continue;
    }

    if (wireType === 5) {
      offset += 4;
      if (offset > buffer.length) {
        throw new Error("Invalid fixed32 field");
      }
      fields.push({ fieldNumber, wireType });
      continue;
    }

    throw new Error(`Unsupported wire type: ${wireType}`);
  }

  return fields;
}

function readVarint(buffer: Buffer, offset: number): [number, number] {
  let value = 0;
  let shift = 0;
  let index = offset;

  while (index < buffer.length) {
    const byte = buffer[index];
    value += (byte & 0x7f) * 2 ** shift;
    index += 1;

    if ((byte & 0x80) === 0) {
      return [value, index];
    }

    shift += 7;
    if (shift > 63) {
      throw new Error("Varint is too large");
    }
  }

  throw new Error("Unexpected end of varint");
}
