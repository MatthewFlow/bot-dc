import { describe, expect, test } from "bun:test";

import { maskForDeepl, unmaskFromDeepl } from "./deepl";

describe("maskForDeepl / unmaskFromDeepl", () => {
  test("round-trips plain prose unchanged", () => {
    const t = "We're deploying a new build. Restart your client.";
    expect(unmaskFromDeepl(maskForDeepl(t))).toBe(t);
  });

  test("round-trips XML special chars (< > &)", () => {
    const t = "a < b && c > d";
    expect(unmaskFromDeepl(maskForDeepl(t))).toBe(t);
  });

  test("round-trips a fenced code block verbatim", () => {
    const t = "Changelog:\n```\nFixed kentrosaurus attack\n```";
    expect(unmaskFromDeepl(maskForDeepl(t))).toBe(t);
  });

  test("wraps fenced code block in a keep tag (DeepL won't translate it)", () => {
    const masked = maskForDeepl("x\n```\ncode\n```");
    expect(masked).toContain("<keep>```\ncode\n```</keep>");
  });

  test("protects version numbers", () => {
    expect(maskForDeepl("Hordetesting - 0.21.659")).toContain("<keep>0.21.659</keep>");
  });

  test("protects proper nouns (dino species)", () => {
    expect(maskForDeepl("Improved austroraptor visibility")).toMatch(
      /<keep>austroraptor<\/keep>/i,
    );
  });

  test("does not protect a noun substring without a word boundary", () => {
    // „Pachy" nie może złapać się wewnątrz „Pachycephalosaurus".
    const masked = maskForDeepl("Pachycephalosaurus update");
    expect(masked).toContain("<keep>Pachycephalosaurus</keep>");
    expect(masked).not.toContain("<keep>Pachy</keep>cephalosaurus");
  });

  test("round-trips a realistic announcement", () => {
    const t =
      "Hey Islanders,\n\n**Hordetesting - 0.21.659**\n```\nFixed tyrannosaurus drink animation\nImproved austroraptor underwater visibility\n```";
    expect(unmaskFromDeepl(maskForDeepl(t))).toBe(t);
  });
});
