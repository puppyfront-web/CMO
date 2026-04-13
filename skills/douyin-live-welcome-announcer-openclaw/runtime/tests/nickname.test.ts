import { describe, expect, test } from "vitest";

import {
  extractNicknameFromText,
  formatNicknameForSpeech,
  normalizeNickname,
  renderWelcomeMessage
} from "../src/nickname.js";

describe("normalizeNickname", () => {
  test("trims common wrappers", () => {
    expect(normalizeNickname("  @阿秋  ")).toBe("阿秋");
    expect(normalizeNickname("\"小明\"")).toBe("小明");
  });
});

describe("extractNicknameFromText", () => {
  test("extracts nickname from standard entry text", () => {
    expect(extractNicknameFromText("阿秋 进入了直播间")).toBe("阿秋");
  });

  test("extracts nickname from alternative spacing", () => {
    expect(extractNicknameFromText("小明进入直播间")).toBe("小明");
  });

  test("extracts nickname from short join text", () => {
    expect(extractNicknameFromText("小石头73337 来了")).toBe("小石头73337");
  });

  test("rejects empty or unrelated text", () => {
    expect(extractNicknameFromText("点赞了主播")).toBeNull();
    expect(extractNicknameFromText("")).toBeNull();
    expect(extractNicknameFromText("点击进入直播间")).toBeNull();
    expect(extractNicknameFromText("直播中 点击进入直播间")).toBeNull();
  });
});

describe("renderWelcomeMessage", () => {
  test("renders template with nickname", () => {
    expect(renderWelcomeMessage("欢迎 {nickname} 来到直播间", "阿秋")).toBe("欢迎 阿秋 来到直播间");
  });

  test("spells digits in nickname one by one", () => {
    expect(renderWelcomeMessage("欢迎 {nickname} 来到直播间", "小石头73337")).toBe(
      "欢迎 小石头 7 3 3 3 7 来到直播间"
    );
  });
});

describe("formatNicknameForSpeech", () => {
  test("keeps non-digit characters and separates adjacent digits", () => {
    expect(formatNicknameForSpeech("A9同学2026")).toBe("A 9 同学 2 0 2 6");
  });
});
