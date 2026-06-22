import { describe, expect, test } from "bun:test";
import type { Context } from "hono";

import { parseLimit } from "./validation";

/** Minimalna atrapa Hono Context — parseLimit czyta tylko `c.req.query("limit")`. */
function ctx(limit?: string): Context {
  return {
    req: { query: (k: string) => (k === "limit" ? limit : undefined) },
  } as unknown as Context;
}

describe("parseLimit", () => {
  test("missing query → default", () => {
    expect(parseLimit(ctx(undefined), 10, 100)).toBe(10);
  });

  test("valid value within range passes through", () => {
    expect(parseLimit(ctx("25"), 10, 100)).toBe(25);
  });

  test("clamps to max", () => {
    expect(parseLimit(ctx("9999"), 10, 100)).toBe(100);
  });

  test("zero or negative → default", () => {
    expect(parseLimit(ctx("0"), 10, 100)).toBe(10);
    expect(parseLimit(ctx("-5"), 10, 100)).toBe(10);
  });

  test("non-numeric → default", () => {
    expect(parseLimit(ctx("abc"), 10, 100)).toBe(10);
    expect(parseLimit(ctx(""), 10, 100)).toBe(10);
  });

  test("exact max is kept", () => {
    expect(parseLimit(ctx("100"), 10, 100)).toBe(100);
  });
});
