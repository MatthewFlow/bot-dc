import { describe, expect, test } from "bun:test";

import { canManageGuild } from "./guildGuard";

describe("canManageGuild", () => {
  test("Administrator (0x8) passes", () => {
    expect(canManageGuild(String(0x8))).toBe(true);
  });

  test("Manage Server (0x20) passes", () => {
    expect(canManageGuild(String(0x20))).toBe(true);
  });

  test("other permissions fail", () => {
    expect(canManageGuild(String(0x400))).toBe(false); // View Channel
    expect(canManageGuild("0")).toBe(false);
  });
});
