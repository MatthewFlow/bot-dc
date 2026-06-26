import { describe, expect, test } from "bun:test";

import { pickWinners } from "./giveawayRepository";

describe("pickWinners", () => {
  test("zwraca tylu zwycięzców, ilu poproszono", () => {
    const winners = pickWinners(["a", "b", "c", "d"], 2);
    expect(winners).toHaveLength(2);
  });

  test("nie zwraca więcej niż jest uczestników", () => {
    expect(pickWinners(["a", "b"], 5)).toHaveLength(2);
  });

  test("bez powtórzeń wśród zwycięzców", () => {
    const winners = pickWinners(["a", "b", "c"], 3);
    expect(new Set(winners).size).toBe(winners.length);
  });

  test("deduplikuje wejścia (jeden user = jedno losowanie)", () => {
    expect(pickWinners(["a", "a", "a"], 3)).toEqual(["a"]);
  });

  test("pomija wykluczonych (reroll)", () => {
    const winners = pickWinners(["a", "b", "c"], 3, ["a", "b"]);
    expect(winners).toEqual(["c"]);
  });

  test("pusta pula → pusty wynik", () => {
    expect(pickWinners([], 3)).toEqual([]);
  });

  test("count <= 0 → pusty wynik", () => {
    expect(pickWinners(["a", "b"], 0)).toEqual([]);
  });

  test("wszyscy uczestnicy są prawidłowymi zwycięzcami", () => {
    const entrants = ["a", "b", "c", "d", "e"];
    for (const w of pickWinners(entrants, 3)) expect(entrants).toContain(w);
  });
});
