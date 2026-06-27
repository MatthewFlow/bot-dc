import { describe, expect, test } from "bun:test";

import { parseDuration } from "./duration";

describe("parseDuration", () => {
  test("pojedyncze jednostki", () => {
    expect(parseDuration("10m")).toBe(600_000);
    expect(parseDuration("2h")).toBe(7_200_000);
    expect(parseDuration("1d")).toBe(86_400_000);
    expect(parseDuration("1w")).toBe(604_800_000);
    expect(parseDuration("30s")).toBe(30_000);
  });

  test("łączone człony sumują się", () => {
    expect(parseDuration("1h30m")).toBe(5_400_000);
    expect(parseDuration("1d 6h")).toBe(86_400_000 + 21_600_000);
  });

  test("wielkość liter i spacje bez znaczenia", () => {
    expect(parseDuration("2H")).toBe(7_200_000);
    expect(parseDuration("10 m")).toBe(600_000);
  });

  test("bez jednostki → null", () => {
    expect(parseDuration("10")).toBeNull();
  });

  test("śmieci → null", () => {
    expect(parseDuration("jutro")).toBeNull();
    expect(parseDuration("")).toBeNull();
  });

  test("zero → null", () => {
    expect(parseDuration("0m")).toBeNull();
  });
});
