"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SidebarBotStatus } from "@/components/SidebarBotStatus";
import { useT } from "@/i18n/LanguageProvider";
import { prefetchGuildData } from "@/lib/api";
import { NAV_GROUPS, NAV_TOP, type NavItem } from "@/lib/nav";

const COLLAPSED_KEY = "jh_nav_collapsed";

export function Sidebar({
  guildName,
  guildIcon,
  open,
  onClose,
}: {
  guildName: string;
  guildIcon?: string | null;
  /** Otwarcie szuflady na mobile (stan trzyma layout). */
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const t = useT();
  const guildId = params.guildId as string;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Ikona serwera z CDN Discorda (gif dla animowanych „a_…"); fallback to inicjał.
  const iconUrl = guildIcon
    ? `https://cdn.discordapp.com/icons/${guildId}/${guildIcon}.${
        guildIcon.startsWith("a_") ? "gif" : "png"
      }?size=64`
    : null;
  const initial =
    guildName && guildName !== "..." ? guildName.trim().charAt(0).toUpperCase() : "JH";

  // Wczytaj zapamiętany stan zwiniętych sekcji. Gdy brak zapisanej preferencji,
  // na telefonie zwijamy wszystkie sekcje domyślnie (oszczędza miejsce na małym
  // ekranie) — na desktopie zostają rozwinięte. Drawer mobilny startuje poza
  // ekranem, więc to dosianie po montażu nie powoduje widocznego mignięcia.
  useEffect(() => {
    let saved: string[] | null = null;
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      if (raw) saved = JSON.parse(raw) as string[];
    } catch {
      /* ignore */
    }

    if (saved) {
      setCollapsed(new Set(saved));
      return;
    }

    const isMobile =
      typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) setCollapsed(new Set(NAV_GROUPS.map((g) => g.id)));
  }, []);

  function toggleGroup(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  function isItemActive(item: NavItem) {
    const href = `/dashboard/${guildId}${item.href}`;
    return item.href === ""
      ? pathname === `/dashboard/${guildId}`
      : pathname.startsWith(href);
  }

  function NavButton({ item }: { item: NavItem }) {
    const href = `/dashboard/${guildId}${item.href}`;
    const isActive = isItemActive(item);
    const Icon = item.icon;

    return (
      <button
        onClick={() => navigate(href)}
        onMouseEnter={() => {
          router.prefetch(href); // JS trasy
          prefetchGuildData(guildId); // dane (jeśli cache wygasł)
        }}
        className={`relative mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          isActive
            ? "bg-card text-primary"
            : "text-gray-300 hover:bg-card hover:text-white"
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
        )}
        <Icon size={18} className="shrink-0" />
        <span className="flex-1 text-left">{t.nav.items[item.key].label}</span>
        {/* „wkrótce" — pozycja klikalna, ale strona to placeholder. */}
        {item.soon && (
          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {t.common.soon}
          </span>
        )}
      </button>
    );
  }

  const navContent = (
    <>
      {/* Logo serwera */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        {iconUrl ? (
          <Image
            src={iconUrl}
            alt={guildName}
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-sm font-bold text-primary">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{guildName}</p>
          <p className="text-xs text-gray-400">{t.common.discordBot}</p>
        </div>
      </div>

      {/* Status bota — przeniesiony tu z TopBara (na desktopie); na mobile zostaje w TopBarze. */}
      <div className="px-3 pt-3">
        <SidebarBotStatus />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {/* Przypięte na górze: Dashboard + Feedback */}
        {NAV_TOP.map((item) => (
          <NavButton key={item.href} item={item} />
        ))}

        {NAV_GROUPS.map((group) => {
          const isCollapsed = collapsed.has(group.id);
          const GroupIcon = group.icon;
          return (
            <div key={group.id} className="mt-4">
              <button
                onClick={() => toggleGroup(group.id)}
                className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 transition hover:text-gray-300 outline-none focus-visible:text-gray-300"
              >
                <GroupIcon size={13} className="shrink-0" />
                <span className="flex-1 text-left">{t.nav.groups[group.key]}</span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                />
              </button>
              {/* Płynne rozwijanie sekcji wzorcem grid 0fr→1fr (treść zawsze w DOM). */}
              <div className={`jh-acc ${isCollapsed ? "" : "open"}`}>
                <div className="jh-acc-in">
                  {group.items.map((item) => (
                    <NavButton key={item.href} item={item} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-xs text-gray-400 hover:text-gray-300"
        >
          ← {t.common.changeServer}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-56 flex-col border-r border-border bg-sidebar md:flex">
        {navContent}
      </aside>

      {/* Mobile — overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} />
      )}

      {/* Mobile — drawer (pt pod notch przez safe-area-inset) */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-[17rem] max-w-[85vw] flex-col border-r border-border bg-sidebar pt-[env(safe-area-inset-top)] transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label={t.topbar.closeMenu}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white/5 hover:text-white"
        >
          ✕
        </button>
        {navContent}
      </aside>
    </>
  );
}
