const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/**
 * Parsuje czas trwania z zapisu typu `10m`, `2h`, `1d`, `1h30m`, `1w` na milisekundy.
 * Sumuje wszystkie człony (jednostki s/m/h/d/w). Zwraca `null`, gdy nic nie dopasowano
 * lub wynik to 0 — czyli np. samo `10` (bez jednostki) jest niepoprawne.
 */
export function parseDuration(input: string): number | null {
  let total = 0;
  let found = false;
  for (const match of input.toLowerCase().matchAll(/(\d+)\s*([smhdw])/g)) {
    total += Number(match[1]) * UNIT_MS[match[2]!]!;
    found = true;
  }
  return found && total > 0 ? total : null;
}
