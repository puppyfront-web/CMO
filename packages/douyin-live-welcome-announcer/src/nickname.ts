const ENTRY_PATTERNS = [
  /^(?<nickname>.+?)\s*进入了直播间[!！。.~\s]*$/u,
  /^(?<nickname>.+?)\s*进入直播间[!！。.~\s]*$/u,
  /^(?<nickname>.+?)\s*来到直播间[!！。.~\s]*$/u,
  /^(?<nickname>.+?)\s*来了[!！。.~\s]*$/u
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

export function renderWelcomeMessage(template: string, nickname: string): string {
  return template.replaceAll("{nickname}", formatNicknameForSpeech(nickname));
}
