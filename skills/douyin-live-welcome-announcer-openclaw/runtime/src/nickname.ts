const ENTRY_PATTERNS = [
  /^(?<nickname>.+?)\s*进入了直播间[!！。.~\s]*$/u,
  /^(?<nickname>.+?)\s*进入直播间[!！。.~\s]*$/u,
  /^(?<nickname>.+?)\s*来到直播间[!！。.~\s]*$/u,
  /^(?<nickname>.+?)\s*来了[!！。.~\s]*$/u
];

const GIFT_PATTERNS = [
  /^(?<nickname>.+?)\s*(?:送出了?|赠送了?|送给主播|赠给主播)\s*(?<gift>.+?)$/u,
  /^(?<nickname>.+?)\s*(?:送给|赠给)\s*(?<target>.+?)\s+(?<gift>(?:\d+\s*个\s*)?.+?)$/u,
  /^(?<nickname>.+?)\s*给\s*(?<target>.+?)\s+(?<gift>(?:\d+\s*个\s*)?.+?)$/u,
  /^(?<nickname>.+?)\s*投喂了?\s*(?<gift>.+?)$/u,
  /^(?<nickname>.+?)\s*打赏了?\s*(?<gift>.+?)$/u,
  /^(?<nickname>.+?)\s*送\s*(?<gift>.+?)$/u
];

const DISALLOWED_NICKNAMES = new Set([
  "点击",
  "立即",
  "马上",
  "现在",
  "直接",
  "进入",
  "加入",
  "打开"
]);

const DISALLOWED_SUBSTRINGS = ["点击", "直播中", "进入直播间", "打开抖音", "去看看"];

export interface GiftEvent {
  nickname: string;
  gift: string;
}

export interface CommentEvent {
  nickname: string;
  comment: string;
}

const COMMENT_PATTERN = /^(?<nickname>[^:：]{1,40}?)\s*[:：]\s*(?<comment>.+)$/u;

export function normalizeNickname(input: string): string {
  return input
    .trim()
    .replace(/^[@＠]+/u, "")
    .replace(/^[“"'"`‘「『\[]+/u, "")
    .replace(/[”"'"`’」』\]]+$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

export function formatNicknameForSpeech(input: string): string {
  return normalizeNickname(input).replace(/\d/gu, " $& ").replace(/\s+/gu, " ").trim();
}

export function normalizeGiftName(input: string): string {
  return input
    .trim()
    .replace(/^\d+\s*个\s*/u, "")
    .replace(/\s*[xX×]\s*\d+\s*$/u, "")
    .replace(/\s*\d+\s*钻\s*$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractGiftNameFromLastToken(input: string): string | null {
  const tokens = input
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter(Boolean);

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];

    if (/^[xX×]\d+$/u.test(token) || /^\d+钻$/u.test(token)) {
      continue;
    }

    const normalized = normalizeGiftName(token);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function extractNicknameFromText(text: string): string | null {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const compactLine = line.replace(/\s+/gu, " ").trim();

    if (!compactLine || compactLine.length > 60) {
      continue;
    }

    for (const pattern of ENTRY_PATTERNS) {
      const match = compactLine.match(pattern);
      const nickname = match?.groups?.nickname;

      if (!nickname) {
        continue;
      }

      const normalized = normalizeNickname(nickname);
      if (
        normalized &&
        !DISALLOWED_NICKNAMES.has(normalized) &&
        !DISALLOWED_SUBSTRINGS.some((item) => normalized.includes(item))
      ) {
        return normalized;
      }
    }
  }

  return null;
}

export function extractGiftEventFromText(text: string): GiftEvent | null {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const compactLine = line.replace(/\s+/gu, " ").trim();

    if (!compactLine || compactLine.length > 120) {
      continue;
    }

    for (const pattern of GIFT_PATTERNS) {
      const match = compactLine.match(pattern);
      const nickname = match?.groups?.nickname;
      const gift = match?.groups?.gift;

      if (!nickname || !gift) {
        continue;
      }

      const normalizedNickname = normalizeNickname(nickname);
      const normalizedGift = extractGiftNameFromLastToken(compactLine) ?? normalizeGiftName(gift);
      if (
        normalizedNickname &&
        normalizedGift &&
        !DISALLOWED_NICKNAMES.has(normalizedNickname) &&
        !DISALLOWED_SUBSTRINGS.some((item) => normalizedNickname.includes(item))
      ) {
        return {
          nickname: normalizedNickname,
          gift: normalizedGift
        };
      }
    }
  }

  return null;
}

export function extractGiftNicknameFromText(text: string): string | null {
  return extractGiftEventFromText(text)?.nickname ?? null;
}

export function extractCommentEventFromText(text: string): CommentEvent | null {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const compactLine = line.replace(/\s+/gu, " ").trim();

    if (!compactLine || compactLine.length > 120) {
      continue;
    }

    if (extractGiftEventFromText(compactLine) || extractNicknameFromText(compactLine)) {
      continue;
    }

    const match = compactLine.match(COMMENT_PATTERN);
    const nickname = match?.groups?.nickname;
    const comment = match?.groups?.comment?.trim();
    if (!nickname || !comment) {
      continue;
    }

    const normalizedNickname = normalizeNickname(nickname);
    if (
      !normalizedNickname ||
      DISALLOWED_NICKNAMES.has(normalizedNickname) ||
      DISALLOWED_SUBSTRINGS.some((item) => normalizedNickname.includes(item))
    ) {
      continue;
    }

    return {
      nickname: normalizedNickname,
      comment: comment.replace(/\s+/gu, " ").trim()
    };
  }

  return null;
}

export function renderWelcomeMessage(template: string, nickname: string, gift = "礼物"): string {
  const spokenNickname = formatNicknameForSpeech(nickname);
  const spokenGift = normalizeGiftName(gift) || "礼物";

  return template
    .replaceAll("{nickname}", spokenNickname)
    .replaceAll("{gift}", spokenGift)
    .replaceAll("${nickname}", spokenNickname)
    .replaceAll("${gift}", spokenGift)
    .replace(/\bnickname\b/gu, spokenNickname)
    .replace(/\bgift\b/gu, spokenGift);
}

export function renderGiftAnnouncement(template: string, nickname: string, gift = "礼物", rawText?: string): string {
  const normalizedRawText = String(rawText ?? "").trim();
  if (normalizedRawText) {
    return normalizedRawText.replace(/\s+/gu, " ").trim();
  }

  return renderWelcomeMessage(template, nickname, gift);
}
