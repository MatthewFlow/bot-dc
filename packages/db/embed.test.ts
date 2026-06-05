import { describe, expect, test } from "bun:test";

import { isEmbedEmpty, toDiscordEmbed } from "./embed";

describe("toDiscordEmbed", () => {
  test("trims and drops empty fields", () => {
    const e = toDiscordEmbed({ title: "  hi  ", description: "" });
    expect(e.title).toBe("hi");
    expect(e.description).toBeUndefined();
  });

  test("substitutes variables via sub()", () => {
    const e = toDiscordEmbed({ description: "Hello {user}" }, (s) =>
      s.replace("{user}", "@bob"),
    );
    expect(e.description).toBe("Hello @bob");
  });

  test("keeps numeric color and adds timestamp when enabled", () => {
    const e = toDiscordEmbed({ title: "x", color: 0x5865f2, timestamp: true });
    expect(e.color).toBe(0x5865f2);
    expect(typeof e.timestamp).toBe("string");
  });

  test("filters out incomplete fields", () => {
    const e = toDiscordEmbed({
      fields: [
        { name: "a", value: "" },
        { name: "b", value: "v" },
      ],
    });
    expect(e.fields?.length).toBe(1);
    expect(e.fields?.[0]?.name).toBe("b");
  });
});

describe("isEmbedEmpty", () => {
  test("true for an empty embed", () => {
    expect(isEmbedEmpty(toDiscordEmbed({}))).toBe(true);
  });

  test("false when there is visible content", () => {
    expect(isEmbedEmpty(toDiscordEmbed({ title: "x" }))).toBe(false);
  });
});
