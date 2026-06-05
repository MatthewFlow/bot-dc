import { describe, expect, test } from "bun:test";

import { levelFromXp, xpToNextLevel } from "./xpHelpers";

describe("levelFromXp", () => {
  test("starts at level 1", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
  });

  test("levels up every 100 xp", () => {
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(250)).toBe(3);
  });
});

describe("xpToNextLevel", () => {
  test("full level remaining at 0 xp", () => {
    expect(xpToNextLevel(0)).toBe(100);
  });

  test("remaining within a level", () => {
    expect(xpToNextLevel(150)).toBe(50);
    expect(xpToNextLevel(100)).toBe(100);
  });
});
