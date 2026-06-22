import { describe, expect, test } from "bun:test";

import { nextRun } from "./worker";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("nextRun", () => {
  test("daily advances by one day when next slot is still in the future", () => {
    const from = new Date(Date.now() + 60_000); // za minutę
    const next = nextRun(from, "daily");
    expect(next.getTime()).toBe(from.getTime() + DAY_MS);
  });

  test("weekly advances by seven days", () => {
    const from = new Date(Date.now() + 60_000);
    const next = nextRun(from, "weekly");
    expect(next.getTime()).toBe(from.getTime() + 7 * DAY_MS);
  });

  test("catch-up: skips missed runs so the result is always in the future", () => {
    // Zadanie zaplanowane 10 dni temu — nextRun musi przeskoczyć pominięte doby.
    const from = new Date(Date.now() - 10 * DAY_MS);
    const next = nextRun(from, "daily");
    expect(next.getTime()).toBeGreaterThan(Date.now());
    // Wynik zachowuje krok doby względem `from`.
    expect((next.getTime() - from.getTime()) % DAY_MS).toBe(0);
  });

  test("catch-up lands within one step past now (not further)", () => {
    const from = new Date(Date.now() - 10 * DAY_MS);
    const next = nextRun(from, "daily");
    expect(next.getTime() - Date.now()).toBeLessThanOrEqual(DAY_MS);
  });

  test("weekly catch-up keeps the weekly step", () => {
    const from = new Date(Date.now() - 30 * DAY_MS);
    const next = nextRun(from, "weekly");
    expect(next.getTime()).toBeGreaterThan(Date.now());
    expect((next.getTime() - from.getTime()) % (7 * DAY_MS)).toBe(0);
  });
});
