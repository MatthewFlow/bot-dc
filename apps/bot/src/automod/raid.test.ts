import { describe, expect, test } from "bun:test";

import { raidThreshold, raidWindowMs } from "./raid";

describe("raidWindowMs", () => {
  test("default (undefined) is 10 s", () => {
    expect(raidWindowMs(undefined)).toBe(10_000);
  });

  test("converts seconds to ms", () => {
    expect(raidWindowMs(30)).toBe(30_000);
  });

  test("clamps the floor to 2 s", () => {
    expect(raidWindowMs(0)).toBe(2000);
    expect(raidWindowMs(1)).toBe(2000);
  });

  test("clamps the ceiling to 5 min", () => {
    expect(raidWindowMs(999)).toBe(5 * 60_000);
    expect(raidWindowMs(300)).toBe(300_000);
  });
});

describe("raidThreshold", () => {
  test("default (undefined) is 10", () => {
    expect(raidThreshold(undefined)).toBe(10);
  });

  test("passes through a sane value", () => {
    expect(raidThreshold(25)).toBe(25);
  });

  test("clamps the floor to 2", () => {
    expect(raidThreshold(0)).toBe(2);
    expect(raidThreshold(1)).toBe(2);
  });
});
