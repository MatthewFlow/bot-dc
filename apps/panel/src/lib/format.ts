/** Wspólne formatowanie liczb (locale pl-PL) — jedno źródło dla całego panelu. */
const nf = new Intl.NumberFormat("pl-PL");

/** Sformatuj liczbę wg locale pl-PL (np. 24100 → „24 100"). */
export function formatNumber(n: number): string {
  return nf.format(n);
}

/** Jak `formatNumber`, ale `null`/`undefined` → „—" (dla niepewnych statystyk). */
export function formatCount(n: number | null | undefined): string {
  return n == null ? "—" : nf.format(n);
}
