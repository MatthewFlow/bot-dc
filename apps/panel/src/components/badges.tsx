import type { ModActionType, TicketStatus } from "@/lib/api";
import { cn } from "@/lib/cn";

// ── Status ticketu ────────────────────────────────────────────────────────────

export const TICKET_STATUS: Record<TicketStatus, { label: string; cls: string }> = {
  pending: { label: "Oczekuje", cls: "bg-yellow-500/15 text-yellow-400" },
  open: { label: "W trakcie", cls: "bg-green-500/15 text-green-400" },
  closed: { label: "Zamknięty", cls: "bg-gray-500/15 text-gray-300" },
};

export function TicketStatusBadge({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  const s = TICKET_STATUS[status];
  return (
    <span
      className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.cls, className)}
    >
      {s.label}
    </span>
  );
}

// ── Akcja moderacyjna ─────────────────────────────────────────────────────────

export const MOD_ACTION: Record<
  ModActionType,
  { label: string; short: string; cls: string }
> = {
  warn: { label: "Ostrzeżenie", short: "Warn", cls: "bg-yellow-400/10 text-yellow-400" },
  mute: { label: "Wyciszenie", short: "Mute", cls: "bg-indigo-400/10 text-indigo-400" },
  unmute: { label: "Odciszenie", short: "Unmute", cls: "bg-green-400/10 text-green-400" },
  kick: { label: "Wyrzucenie", short: "Kick", cls: "bg-red-400/10 text-red-400" },
  ban: { label: "Ban", short: "Ban", cls: "bg-red-500/10 text-red-500" },
  clearwarns: {
    label: "Wyczyszczono",
    short: "Clear",
    cls: "bg-gray-400/10 text-gray-300",
  },
};

/** Etykieta akcji moderacyjnej. `variant="long"` — pełna PL nazwa (feed), `"short"` — tag (dziennik). */
export function ModActionBadge({
  type,
  variant = "long",
  className,
}: {
  type: ModActionType;
  variant?: "long" | "short";
  className?: string;
}) {
  const m = MOD_ACTION[type];
  return (
    <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", m.cls, className)}>
      {variant === "short" ? m.short : m.label}
    </span>
  );
}
