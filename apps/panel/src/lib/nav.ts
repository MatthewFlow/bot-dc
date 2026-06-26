import {
  DoorOpen,
  Gamepad2,
  Gift,
  Languages,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  MessageSquareHeart,
  MousePointerClick,
  Pin,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldBan,
  SlidersHorizontal,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";

export type NavItem = {
  label: string;
  /** Sufiks ścieżki po `/dashboard/[guildId]` (puste = strona przeglądu). */
  href: string;
  desc: string;
  icon: LucideIcon;
  /** Pozycja „wkrótce" — klikalna (z plakietką), ale strona to placeholder. */
  soon?: boolean;
};

export type NavGroup = {
  /** Etykieta sekcji (nagłówek w sidebarze / na overview). */
  label: string;
  /** Stabilny identyfikator sekcji (klucz stanu zwinięcia w localStorage). */
  id: string;
  icon: LucideIcon;
  items: NavItem[];
};

/** Strona przeglądu — zawsze na górze, poza grupami. */
export const NAV_OVERVIEW: NavItem = {
  label: "Dashboard",
  href: "",
  desc: "Przegląd serwera",
  icon: LayoutDashboard,
};

/** Feedback — wyróżniony na górze nawigacji, poza grupami. */
export const NAV_FEEDBACK: NavItem = {
  label: "Feedback",
  href: "/feedback",
  desc: "Podziel się uwagami i sugestiami",
  icon: MessageSquareHeart,
};

/** Pozycje przypięte na górze sidebara (poza sekcjami). */
export const NAV_TOP: NavItem[] = [NAV_OVERVIEW, NAV_FEEDBACK];

/** Pozycje nawigacji pogrupowane w sekcje. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Onboarding",
    id: "onboarding",
    icon: DoorOpen,
    items: [
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
        label: "Self-Roles",
        href: "/roles",
        desc: "Role do samodzielnego wzięcia (przyciski / reakcje)",
        icon: MousePointerClick,
      },
    ],
  },
  {
    label: "Społeczność",
    id: "community",
    icon: Users,
    items: [
      {
        label: "Levelowanie",
        href: "/levels",
        desc: "System XP, poziomów i nagród",
        icon: TrendingUp,
      },
      {
        label: "Tickety",
        href: "/tickets",
        desc: "Obsługa zgłoszeń użytkowników",
        icon: Ticket,
      },
      {
        label: "Ogłoszenia",
        href: "/announce",
        desc: "Wyślij lub zaplanuj wiadomość embed",
        icon: Megaphone,
      },
      {
        label: "Sticky",
        href: "/sticky",
        desc: "Przypięta wiadomość trzymana na dole kanału",
        icon: Pin,
      },
      {
        label: "Tłumaczenia",
        href: "/translation",
        desc: "Auto-tłumaczenie wiadomości ze śledzonego kanału",
        icon: Languages,
        soon: true,
      },
      {
        label: "Giveawaye",
        href: "/giveaways",
        desc: "Konkursy z losowaniem nagród",
        icon: Gift,
      },
    ],
  },
  {
    label: "Bezpieczeństwo",
    id: "security",
    icon: ShieldAlert,
    items: [
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
    ],
  },
  {
    label: "System",
    id: "system",
    icon: Wrench,
    items: [
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
      {
        label: "Serwer gry",
        href: "/gameserver",
        desc: "Zarządzanie serwerem The Isle: Evrima (RCON)",
        icon: Gamepad2,
        soon: true,
      },
    ],
  },
];

/** Płaska lista wszystkich pozycji (overview + grupy) — overview pierwszy. */
export const NAV_ITEMS: NavItem[] = [
  ...NAV_TOP,
  ...NAV_GROUPS.flatMap((group) => group.items),
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

/** Grupa, do której należy dana pozycja (do kategorii w breadcrumbie). */
export function findNavGroup(item: NavItem | undefined): NavGroup | undefined {
  if (!item || item.href === "") return undefined;
  return NAV_GROUPS.find((group) => group.items.some((i) => i.href === item.href));
}
