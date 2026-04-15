import { describe, expect, test } from "vitest";

import { extractGiftEventFromWebcastFrame, isDouyinWebcastPushSocketUrl } from "../src/webcast.js";

const GIFT_FRAME_BASE64 = [
  "CBAQoLX2sNfb3ZMLGLhFIAgqFQoNY29tcHJlc3NfdHlwZRIEZ3ppcCpvCg9pbS1pbnRlcm5hbF9leHQSXGludGVybmFsX3NyYzpwdXNoc2VydmVyfGZpcnN0",
  "X3JlcV9tczoxNzc2MTIxMzQ5ODMyfHdzc19tc2dfdHlwZTpyfHdyZHNfdjo3NjI4MzgzMTg5Mjg2NzgzNDM5KjoKCWltLWN1cnNvchItdC0xNzc2MTIxMzcz",
  "NTgxX3ItNzYyODM4MzIxMDc2MTYyNTY3NF9kLTFfdS0xKhcKBmltLW5vdxINMTc3NjEyMTM3MzU4MSoZCg5pbS1saXZlX2N1cnNvchIHZC0xX3UtMTICcGI6",
  "A21zZ0L5FR+LCAAAAAAAAP/sWQ9sE+fZ5z2njnNQ8HfVpy/K169yL98mxuzk/t/ZUzdsxwFDgPyBENJ1x9l+7Ryx78zdOU5IMxXKtvAvoEJZS9uVBUQpa2mg",
  "lKIApWIrqzoEVbVpK9qmlsVO6Kp2Y2Vbp02aznZioGkbs6JVK7YSv+/zPu/z5/c897x/Dt1Si2LLYSgs6cY8OWosgrouxSD2bg36ITrZiH37/j2nz/351+/J",
  "lbt2fnfg7JmfvSc7/viTX7z6K5oAnq9nnxjIbNuceXbf2MHD3uD7J/qzRx7LHnkss/Hp7IZNoxv63z+xwXPpgbWjxx8dOXY8+9CzDnLk2IHM0NbMqQczpx70",
  "/aMCdabzOkUdKhFRNTqgJiY7RUkJd6iaGJOjhpjImyJ20VhNL+FJ6VDrc+SlOnrJPkcv1Tdy7ICjl/bohiYrsb5exiMnpBjsq5qJVlRHo1EpDEnWsc2CP2e1",
  "TcfyRCEM+WjUsc1yADxqRXdabYf6f/nB8MMvXpCrqqfg1mGk3BsUI6lw52WkYVELk25Y5fV5vV5voq2R7vY1CXJ0EbN4Fb+ok0nTrcs0/8KktLxhvqs5WNcQ",
  "SWrBzpZuNs76Wgmd5NiFyTp2xbLWUFuTHnrHsh5B7+0wjKTuqa1NkqSrgFBNRE31yEpSDteE1UStnIjVFkZqFZgWTVjEmCZFoBiHXTAudpEiydQkldi3jWS8",
  "y6WGVtXkUEHbJ4TTn7Vs7MtTm1ZpdzgI4Pvfypn4/4xt2TN2YMPosxtGh58imdHhpzKbNo3+aPe2MjBYNpVIvFY2L4//4iVqc2udmFqtBKIdbY3tq/3LJYVh",
  "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",
  "DO2eO2s++CcAAAD//wEAAP//e/sXZ2kgAAA="
].join("");

const MEMBER_FRAME_BASE64 = [
  "CAQQttSHo9f73fkIGLhFIAgqFQoNY29tcHJlc3NfdHlwZRIEZ3ppcCpvCg9pbS1pbnRlcm5hbF9leHQSXGludGVybmFsX3NyYzpwdXNoc2VydmVyfGZpcnN0",
  "X3JlcV9tczoxNzc2MTIwOTIzMjU1fHdzc19tc2dfdHlwZTpyfHdyZHNfdjo3NjI4MzgxMjk1MjA2MjA4NDQ3KjoKCWltLWN1cnNvchItdC0xNzc2MTIwOTI5",
  "NDE5X3ItNzYyODM4MTMwMzc5NjE0NjA5Nl9kLTFfdS0xKhcKBmltLW5vdxINMTc3NjEyMDkyOTQxOSoZCg5pbS1saXZlX2N1cnNvchIHZC0xX3UtMTICcGI6",
  "A21zZ0LRBx+LCAAAAAAAAP/sl9trI1Ucx/ckoZuOtVuisGWFJbbggzDNOZnJTBIQd9Jk29hme6NptwqHyeQknTZz6TmTTIP1gujSbLUWQcGuC7LFXeyyspYF",
  "MeyD+iDF9d0L6JO9INjC4h8gvVBEFLoPi4KZt5kz8/t+f7/vzIc53MpZ7vExktNU5mSIkSM0QxhTiyTw6lnuJvf3a22Xf/7y+s7CTzt6+/J7lxa//frejg5B",
  "4rdm7rRuVtSSnsfTpIrtkqqRSauUJzRw6kUYLzNCXwpuXv3ol/qlM61cc2cuWtg/gkvejtvN/kcCLdzJzmh3Sj5/PrjkXQUfNHPvN/s/nf/u9/q7n/2ot60v",
  "L678AM50bl5d3Fh6c+PW9e1P1pT07t35zTtXNu9c2bj88WZtYas2v3u3FgTPzQPuDTDpODaLh0I2Ql15q1zVTVvXujTLCKkuMUgIQTiLIDw449WK6qg05FiM",
  "10xe52EUCRqEkNcItqJKShnoGx7rgelCakIRkol0OFUtESlJ9AndVTKjil7umrJJ8dkCtYxnBCjJkowEQVwFr3ATR04E3j2Y6V8M6UYxdLgSMomL98aFi1TN",
  "E1wiFVLCFYSR2GWbxZcdu1ThrdxUl26oRdLeFgxCkHiivbXj9PZbK9urta1bta36DSRu1W9sLCxs3fxwDbT6u9vqIOxFUSnukeQ6uAdg6zLIPXxj14DKXfxT",
  "DsdQ2U8D22r1UCY8ixH8B42WYAsEXwGO83c0cT7/icCJ1zwn1jwnlTTOl7Xp+57+zIjo9k8pCUVRFGN8UJhNDEX1Qka8MCVnpkVXyI7S7j5bHevv5YfTyf68",
  "TdPTI7ORUiSRhQxJkT47Gbk4ms2ND7Hcba/3V++/neaSD1zzHecr+MbXc9D8hQFrOJvE5RkzVZgcH5yY6R5TTVFM42JCGugbGhFiBdlV026WZSdmqNVjDmOk",
  "JbUkclOxalabZvd9b3u4msffFHjd8zC7555/sDflgYoHnjreY8eIIACaesEgGF9a98wD7xdgFwUaqGqgqoGqBqr+g6hqh4PgHdD4P2tArwG9BvT+J9BbBr7g",
  "4DnPGniMayWmQyh2dBs7VZsEAFwDT3KPGqyI2aTlHlxs27+JWpaBTYsaaqn9aJsb4B0eybKEwjAWjokohikvS+GoEEUCFOSYhEQJxiSc5xEu8yi48Hl9/Xvh",
  "6Rf0vYqmWsKManG7zCYZoRVC5wo6ZQ6mZAYbLH5UWAhHInMuY3jP156lOJ1zaZ7hSvxQLByLhKEUhlFRlM+d6gV/AAAA//8BAAD//xF1RAu+DwAA"
].join("");

function decodeFrame(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  let nextValue = value;

  while (nextValue >= 0x80) {
    bytes.push((nextValue & 0x7f) | 0x80);
    nextValue >>= 7;
  }

  bytes.push(nextValue);
  return bytes;
}

function encodeLengthDelimited(fieldNumber: number, value: Buffer | string): Buffer {
  const data = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return Buffer.from([(fieldNumber << 3) | 2, ...encodeVarint(data.length), ...data]);
}

function createGiftFrame(summary: string, slotTexts: string[]): Buffer {
  const template = Buffer.concat(
    slotTexts.map((text) => {
      const slot = encodeLengthDelimited(11, text);
      return encodeLengthDelimited(4, slot);
    })
  );

  return Buffer.concat([
    encodeLengthDelimited(1, "WebcastGiftMessage"),
    encodeLengthDelimited(7, summary),
    encodeLengthDelimited(8, template)
  ]);
}

describe("isDouyinWebcastPushSocketUrl", () => {
  test("matches the live webcast push socket endpoint", () => {
    expect(isDouyinWebcastPushSocketUrl("wss://webcast5-ws-web-lq.douyin.com/webcast/im/push/v2/?foo=1")).toBe(true);
    expect(isDouyinWebcastPushSocketUrl("wss://example.com/socket")).toBe(false);
  });
});

describe("extractGiftEventFromWebcastFrame", () => {
  test("extracts sender nickname and gift name from a gift frame", () => {
    expect(extractGiftEventFromWebcastFrame(decodeFrame(GIFT_FRAME_BASE64))).toEqual({
      nickname: "OpenAEON.AI",
      gift: "小心心",
      summary: "李同学讲AI（洛洛助手版）:送给主播 1个小心心"
    });
  });

  test("returns null for a non-gift webcast frame", () => {
    expect(extractGiftEventFromWebcastFrame(decodeFrame(MEMBER_FRAME_BASE64))).toBeNull();
  });

  test("returns null for invalid payloads", () => {
    expect(extractGiftEventFromWebcastFrame(Buffer.from("not-a-webcast-frame"))).toBeNull();
  });

  test("does not treat quantity markers like x1 as nicknames", () => {
    const frame = createGiftFrame("x1 小心心", ["x1", "小心心"]);

    expect(extractGiftEventFromWebcastFrame(frame)).toBeNull();
  });
});
