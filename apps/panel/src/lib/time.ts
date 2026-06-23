/** Wspólne formatowanie czasu względnego po polsku — jedno źródło dla całego panelu. */

type DateInput = string | number | Date;

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

/** Zwięzły czas względny: „przed chwilą", „12 min", „3 godz", „2 dni". */
export function relativeTime(input: DateInput): string {
  const ms = Date.now() - toDate(input).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "przed chwilą";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} godz`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 dzień" : `${d} dni`;
}

/** Czas oczekiwania od daty: „2h 15min", „3 dni" (do ticketów czekających). */
export function waitingSince(input: DateInput): string {
  const ms = Date.now() - toDate(input).getTime();
  if (ms < 0) return "przed chwilą";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "przed chwilą";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}min`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 dzień" : `${d} dni`;
}

/** Uptime ze `startedAt`: „14d 06:21" lub „06:21". `—` gdy brak/niepoprawne. */
export function formatUptime(startedAt: string | null | undefined): string {
  if (!startedAt) return "—";
  const ms = Date.now() - new Date(startedAt).getTime();
  if (ms < 0) return "—";
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return days > 0 ? `${days}d ${pad(hours)}:${pad(mins)}` : `${pad(hours)}:${pad(mins)}`;
}

/** Czas dzienny: „dziś", „wczoraj", „N dni temu", a starsze — data (do feedbacku). */
export function dayAgo(input: DateInput): string {
  const date = toDate(input);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "dziś";
  if (days === 1) return "wczoraj";
  if (days < 7) return `${days} dni temu`;
  return date.toLocaleDateString("pl-PL");
}
