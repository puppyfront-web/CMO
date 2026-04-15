import { describe, expect, test } from "vitest";

import { parseCliArgs } from "../src/config.js";

describe("parseCliArgs", () => {
  test("keeps the first flag when no explicit subcommand is provided", () => {
    const config = parseCliArgs(["--url", "https://example.com/live"]);

    expect(config.command).toBe("watch");
    expect(config.url).toBe("https://example.com/live");
    expect(config.launchUrl).toBe("https://example.com/live");
  });

  test("requires an explicit url for watch mode", () => {
    expect(() => parseCliArgs([])).toThrow("watch 模式必须提供 --url 直播间链接");
  });

  test("allows smoke fixture without an explicit url", () => {
    const config = parseCliArgs(["smoke-fixture"]);

    expect(config.command).toBe("smoke-fixture");
    expect(config.url.startsWith("file://")).toBe(true);
    expect(config.launchUrl).toBe(config.url);
  });

  test("defaults to auto speaker engine", () => {
    const config = parseCliArgs(["--url", "https://example.com/live"]);

    expect(config.speakerEngine).toBe("auto");
  });

  test("opens douyin homepage first when watching a douyin room", () => {
    const config = parseCliArgs(["--url", "https://live.douyin.com/123456"]);

    expect(config.url).toBe("https://live.douyin.com/123456");
    expect(config.launchUrl).toBe("https://live.douyin.com/");
  });
});
