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
      roleRewards: [
        { level: 5, roleId: "r1" },
        { level: 0, roleId: "x" },
        { level: 2 },
      ],
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
});
