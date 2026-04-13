import { describe, expect, test } from "vitest";

import { parseCliArgs } from "../src/config.js";

describe("parseCliArgs", () => {
  test("keeps the first flag when no explicit subcommand is provided", () => {
    const config = parseCliArgs(["--url", "https://example.com/live"]);

    expect(config.command).toBe("watch");
    expect(config.url).toBe("https://example.com/live");
  });

  test("defaults to auto speaker engine", () => {
    const config = parseCliArgs([]);

    expect(config.speakerEngine).toBe("auto");
  });
});
