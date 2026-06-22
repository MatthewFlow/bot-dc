import { describe, expect, test } from "bun:test";

import { avatarUrl } from "./discord";

describe("avatarUrl", () => {
  test("builds a CDN URL from id + hash", () => {
    expect(avatarUrl("123", "abc")).toBe(
      "https://cdn.discordapp.com/avatars/123/abc.png",
    );
  });

  test("null hash → null", () => {
    expect(avatarUrl("123", null)).toBeNull();
  });

  test("undefined hash → null", () => {
    expect(avatarUrl("123", undefined)).toBeNull();
  });

  test("empty hash → null", () => {
    expect(avatarUrl("123", "")).toBeNull();
  });
});
