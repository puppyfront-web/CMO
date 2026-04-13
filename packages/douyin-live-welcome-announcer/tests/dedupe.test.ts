import { describe, expect, test } from "vitest";

import { Deduper } from "../src/dedupe.js";

describe("Deduper", () => {
  test("suppresses duplicates inside the ttl window", () => {
    const deduper = new Deduper(5_000, () => 1_000);

    expect(deduper.shouldAccept("阿秋")).toBe(true);
    expect(deduper.shouldAccept("阿秋")).toBe(false);
  });

  test("allows the same nickname after ttl expires", () => {
    let now = 1_000;
    const deduper = new Deduper(5_000, () => now);

    expect(deduper.shouldAccept("阿秋")).toBe(true);
    now = 7_000;
    expect(deduper.shouldAccept("阿秋")).toBe(true);
  });
});
