import { describe, expect, test } from "bun:test";

import { sanitizeConfigPatch } from "./configSanitize";

type EmbedOut = {
  welcomeEmbed?: { title?: string; thumbnailUrl?: string; imageUrl?: string };
};
type RewardsOut = { roleRewards?: Array<{ level: number; roleId: string }> };
type AutoModOut = {
  autoMod?: {
    enabled: boolean;
    action: string;
    spamMaxMessages: number;
    muteDurationSeconds: number;
  };
};

describe("sanitizeConfigPatch", () => {
  test("passes null through to clear a field", () => {
    expect(sanitizeConfigPatch({ welcomeEmbed: null })).toEqual({ welcomeEmbed: null });
  });

  test("keeps a valid id, drops a non-string id", () => {
    expect(sanitizeConfigPatch({ joinRoleId: "123" })).toEqual({ joinRoleId: "123" });
    expect(sanitizeConfigPatch({ joinRoleId: 123 })).toEqual({});
  });

  test("drops non-http/non-template embed urls, keeps valid ones", () => {
    const out = sanitizeConfigPatch({
      welcomeEmbed: {
        title: "x",
        thumbnailUrl: "javascript:alert(1)",
        imageUrl: "https://a.png",
      },
    }) as EmbedOut;
    expect(out.welcomeEmbed?.title).toBe("x");
    expect(out.welcomeEmbed?.thumbnailUrl).toBeUndefined();
    expect(out.welcomeEmbed?.imageUrl).toBe("https://a.png");
  });

  test("allows a {variable} placeholder in url fields", () => {
    const out = sanitizeConfigPatch({
      welcomeEmbed: { thumbnailUrl: "{avatar}" },
    }) as EmbedOut;
    expect(out.welcomeEmbed?.thumbnailUrl).toBe("{avatar}");
  });

  test("filters invalid roleRewards", () => {
    const out = sanitizeConfigPatch({
      roleRewards: [{ level: 5, roleId: "r1" }, { level: 0, roleId: "x" }, { level: 2 }],
    }) as RewardsOut;
    expect(out.roleRewards).toEqual([{ level: 5, roleId: "r1" }]);
  });

  test("clamps automod numbers and validates the action enum", () => {
    const out = sanitizeConfigPatch({
      autoMod: {
        enabled: true,
        action: "bogus",
        spamMaxMessages: 9999,
        muteDurationSeconds: -5,
      },
    }) as AutoModOut;
    expect(out.autoMod?.enabled).toBe(true);
    expect(out.autoMod?.action).toBe("delete");
    expect(out.autoMod?.spamMaxMessages).toBe(50);
    expect(out.autoMod?.muteDurationSeconds).toBe(10);
  });

  test("filters disabledCommands to a clean string array", () => {
    const out = sanitizeConfigPatch({
      disabledCommands: ["level", 5, "  profile  ", "", "leaderboard"],
    }) as { disabledCommands?: string[] };
    expect(out.disabledCommands).toEqual(["level", "profile", "leaderboard"]);
  });

  test("trims and clamps the prefix, dropping whitespace-containing values", () => {
    expect(sanitizeConfigPatch({ prefix: "  !  " })).toEqual({ prefix: "!" });
    expect(sanitizeConfigPatch({ prefix: "!!!!!!!!" })).toEqual({ prefix: "!!!!!" });
    expect(sanitizeConfigPatch({ prefix: "a b" })).toEqual({});
    expect(sanitizeConfigPatch({ prefix: "   " })).toEqual({});
    expect(sanitizeConfigPatch({ prefix: null })).toEqual({ prefix: null });
  });

  test("coerces dmOnPunish to a boolean", () => {
    expect(sanitizeConfigPatch({ dmOnPunish: true })).toEqual({ dmOnPunish: true });
    expect(sanitizeConfigPatch({ dmOnPunish: "yes" })).toEqual({ dmOnPunish: false });
  });

  test("clamps autoBanThreshold to 0..20", () => {
    expect(sanitizeConfigPatch({ autoBanThreshold: 5 })).toEqual({ autoBanThreshold: 5 });
    expect(sanitizeConfigPatch({ autoBanThreshold: 999 })).toEqual({
      autoBanThreshold: 20,
    });
    expect(sanitizeConfigPatch({ autoBanThreshold: -3 })).toEqual({
      autoBanThreshold: 0,
    });
  });

  test("clamps warnDecayDays to 0..365", () => {
    expect(sanitizeConfigPatch({ warnDecayDays: 30 })).toEqual({ warnDecayDays: 30 });
    expect(sanitizeConfigPatch({ warnDecayDays: 9999 })).toEqual({
      warnDecayDays: 365,
    });
    expect(sanitizeConfigPatch({ warnDecayDays: -5 })).toEqual({ warnDecayDays: 0 });
  });

  test("clamps the xp multiplier and filters leveling arrays", () => {
    const out = sanitizeConfigPatch({
      leveling: { xpMultiplier: 99, levelUpEnabled: false, noXpRoleIds: ["a", 5, "b"] },
    }) as {
      leveling?: { xpMultiplier: number; levelUpEnabled: boolean; noXpRoleIds: string[] };
    };
    expect(out.leveling?.xpMultiplier).toBe(10);
    expect(out.leveling?.levelUpEnabled).toBe(false);
    expect(out.leveling?.noXpRoleIds).toEqual(["a", "b"]);
  });
});
