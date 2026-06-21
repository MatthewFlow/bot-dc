import { Ban, type LucideIcon, MicOff, ShieldAlert, UserMinus } from "lucide-react";

/** Akcje moderacyjne wykonywane z panelu (Szybkie akcje + Karta członka). */
export type PunishKind = "warn" | "mute" | "kick" | "ban";

export type PunishMeta = {
  /** Etykieta przycisku/akcji. */
  label: string;
  /** Odpowiadająca komenda bota (pokazywana pod kafelkiem). */
  command: string;
  icon: LucideIcon;
  /** Klasy kafelka ikony — spójne z paletą odznak `MOD_ACTION`. */
  iconCls: string;
  /** Wycisz wymaga czasu trwania, ban — opcjonalnego usuwania wiadomości. */
  needsDuration?: boolean;
  needsDeleteDays?: boolean;
  /** Czy akcja jest destrukcyjna (czerwony przycisk potwierdzenia w modalu). */
  destructive?: boolean;
};

export const PUNISH_META: Record<PunishKind, PunishMeta> = {
  warn: {
    label: "Ostrzeż",
    command: "/mod_warn",
    icon: ShieldAlert,
    iconCls: "bg-yellow-400/10 text-yellow-400",
  },
  mute: {
    label: "Wycisz",
    command: "/mod_mute",
    icon: MicOff,
    iconCls: "bg-indigo-400/10 text-indigo-400",
    needsDuration: true,
  },
  kick: {
    label: "Wyrzuć",
    command: "/mod_kick",
    icon: UserMinus,
    iconCls: "bg-orange-400/10 text-orange-400",
    destructive: true,
  },
  ban: {
    label: "Zbanuj",
    command: "/mod_ban",
    icon: Ban,
    iconCls: "bg-red-500/10 text-red-500",
    needsDeleteDays: true,
    destructive: true,
  },
};

export const PUNISH_ORDER: PunishKind[] = ["warn", "mute", "kick", "ban"];

/** Opcje czasu wyciszenia (minuty) — odzwierciedlają typowe wartości komendy. */
export const MUTE_DURATIONS: { label: string; minutes: number }[] = [
  { label: "60 sekund", minutes: 1 },
  { label: "5 minut", minutes: 5 },
  { label: "10 minut", minutes: 10 },
  { label: "1 godzina", minutes: 60 },
  { label: "1 dzień", minutes: 1440 },
  { label: "1 tydzień", minutes: 10080 },
];

/** Opcje czasu bana (minuty); 0 = ban na stałe (auto-unban przez kolejkę zadań). */
export const BAN_DURATIONS: { label: string; minutes: number }[] = [
  { label: "Na stałe", minutes: 0 },
  { label: "1 godzina", minutes: 60 },
  { label: "6 godzin", minutes: 360 },
  { label: "1 dzień", minutes: 1440 },
  { label: "7 dni", minutes: 10080 },
  { label: "30 dni", minutes: 43200 },
];
