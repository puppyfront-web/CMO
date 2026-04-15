import { describe, expect, test } from "vitest";

import {
  extractGiftEventFromText,
  extractGiftNicknameFromText,
  extractNicknameFromText,
  formatNicknameForSpeech,
  renderGiftAnnouncement,
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

describe("extractGiftNicknameFromText", () => {
  test("extracts nickname from gift text", () => {
    expect(extractGiftNicknameFromText("小石头73337 送出了 比心兔兔")).toBe("小石头73337");
    expect(extractGiftNicknameFromText("康庆 赠送了 花间浪漫")).toBe("康庆");
  });

  test("rejects non-gift text", () => {
    expect(extractGiftNicknameFromText("小石头73337 来了")).toBeNull();
    expect(extractGiftNicknameFromText("加入聊天")).toBeNull();
  });
});

describe("extractGiftEventFromText", () => {
  test("extracts nickname and gift name from standard gift text", () => {
    expect(extractGiftEventFromText("小石头73337 送出了 比心兔兔")).toEqual({
      nickname: "小石头73337",
      gift: "比心兔兔"
    });
    expect(extractGiftEventFromText("康庆 赠送了 花间浪漫")).toEqual({
      nickname: "康庆",
      gift: "花间浪漫"
    });
  });

  test("extracts gift name when text includes amount suffix", () => {
    expect(extractGiftEventFromText("阿秋 送出了 小心心 x1")).toEqual({
      nickname: "阿秋",
      gift: "小心心"
    });
  });

  test("prefers the last meaningful token in rawText as gift name", () => {
    expect(extractGiftEventFromText("阿秋 送出了 比心兔兔")).toEqual({
      nickname: "阿秋",
      gift: "比心兔兔"
    });
    expect(extractGiftEventFromText("阿秋 送出了 比心兔兔 x1")).toEqual({
      nickname: "阿秋",
      gift: "比心兔兔"
    });
  });

  test("extracts only gift name when message includes broadcaster nickname", () => {
    expect(extractGiftEventFromText("LuoLuo 送给 李同学讲AI（洛洛助手版） 1个小心心")).toEqual({
      nickname: "LuoLuo",
      gift: "小心心"
    });
    expect(extractGiftEventFromText("LuoLuo 给 李同学讲AI（洛洛助手版） 1个小心心")).toEqual({
      nickname: "LuoLuo",
      gift: "小心心"
    });
  });

  test("returns null for non-gift text", () => {
    expect(extractGiftEventFromText("阿秋 来了")).toBeNull();
    expect(extractGiftEventFromText("LuoLuo： 出了")).toBeNull();
  });
});

describe("renderWelcomeMessage", () => {
  test("renders template with nickname", () => {
    expect(renderWelcomeMessage("欢迎 {nickname} 来到直播间", "阿秋")).toBe("欢迎 阿秋 来到直播间");
  });

  test("renders template with nickname and gift", () => {
    expect(renderWelcomeMessage("感谢{nickname}送的{gift}，比心", "小石头73337", "比心兔兔")).toBe(
      "感谢小石头 7 3 3 3 7送的比心兔兔，比心"
    );
  });

  test("renders template when braces are stripped and nickname remains literal", () => {
    expect(renderWelcomeMessage("欢迎 nickname 来到直播间", "阿秋")).toBe("欢迎 阿秋 来到直播间");
  });

  test("spells digits in nickname one by one", () => {
    expect(renderWelcomeMessage("欢迎 {nickname} 来到直播间", "小石头73337")).toBe(
      "欢迎 小石头 7 3 3 3 7 来到直播间"
    );
  });
});

describe("renderGiftAnnouncement", () => {
  test("prefers the full raw gift text when available", () => {
    expect(renderGiftAnnouncement("感谢{nickname}送的{gift}，比心", "阿秋", "小心心", "阿秋 送出了 小心心")).toBe(
      "阿秋 送出了 小心心"
    );
  });

  test("falls back to template rendering when raw gift text is missing", () => {
    expect(renderGiftAnnouncement("感谢{nickname}送的{gift}，比心", "阿秋", "小心心")).toBe("感谢阿秋送的小心心，比心");
  });
});

describe("formatNicknameForSpeech", () => {
  test("keeps non-digit characters and separates adjacent digits", () => {
    expect(formatNicknameForSpeech("A9同学2026")).toBe("A 9 同学 2 0 2 6");
  });
});
