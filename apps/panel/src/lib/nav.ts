import {
  DoorOpen,
  LayoutDashboard,
  type LucideIcon,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldBan,
  SlidersHorizontal,
  Ticket,
  TrendingUp,
  UserPlus,
  Zap,
} from "lucide-react";

export type NavItem = {
  label: string;
  /** Sufiks ścieżki po `/dashboard/[guildId]` (puste = strona przeglądu). */
  href: string;
  desc: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "",
    desc: "Przegląd serwera",
    icon: LayoutDashboard,
  },
  {
    label: "Welcome / Goodbye",
    href: "/welcome",
    desc: "Kanały i wiadomości powitalne",
    icon: DoorOpen,
  },
  {
    label: "Auto-role",
    href: "/autorole",
    desc: "Rola nadawana po wejściu",
    icon: UserPlus,
  },
  {
    label: "Reaction Roles",
    href: "/reaction-roles",
    desc: "Role za reakcje pod wiadomością",
    icon: Zap,
  },
  {
    label: "Levelowanie",
    href: "/levels",
    desc: "System XP, poziomów i nagród",
    icon: TrendingUp,
  },
  {
    label: "Moderacja",
    href: "/moderation",
    desc: "Ostrzeżenia, bany, logi akcji",
    icon: ShieldAlert,
  },
  {
    label: "Auto-moderacja",
    href: "/automod",
    desc: "Filtry spamu, linków i słów",
    icon: ShieldBan,
  },
  {
    label: "Logi serwera",
    href: "/serverlog",
    desc: "Logi wiadomości, wejść i ról",
    icon: ScrollText,
  },
  {
    label: "Tickety",
    href: "/tickets",
    desc: "Obsługa zgłoszeń użytkowników",
    icon: Ticket,
  },
  {
    label: "Komendy",
    href: "/commands",
    desc: "Włączanie i wyłączanie komend bota",
    icon: SlidersHorizontal,
  },
  {
    label: "Ustawienia",
    href: "/settings",
    desc: "Rola admina i kanał logów moderacji",
    icon: Settings,
  },
];

/** Dopasowuje pozycję nawigacji do bieżącej ścieżki (do breadcrumbów/topbara). */
export function findNavItem(pathname: string, guildId: string): NavItem | undefined {
  const base = `/dashboard/${guildId}`;
  // Najpierw dłuższe ścieżki, żeby `/welcome` wygrało z `` (overview).
  const sorted = [...NAV_ITEMS].sort((a, b) => b.href.length - a.href.length);
  return sorted.find((item) =>
    item.href === "" ? pathname === base : pathname.startsWith(base + item.href),
  );
}
