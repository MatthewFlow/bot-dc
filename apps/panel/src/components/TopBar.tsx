"use client";

import { ChevronRight, LogOut, Menu, Search, ServerCog } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { BotStatusBadge } from "@/components/BotStatusBadge";
import { NotificationBell } from "@/components/NotificationBell";
import { Skeleton } from "@/components/Skeleton";
import type { User } from "@/lib/api";
import { getMe, logout } from "@/lib/api";
import { discordAvatarUrl } from "@/lib/format";
import { findNavGroup, findNavItem } from "@/lib/nav";

export function TopBar({
  guildName,
  onMenuClick,
}: {
  guildName: string;
  /** Otwiera szufladę nawigacji na mobile. */
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const guildId = params.guildId as string;

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {});
  }, []);

  const section = findNavItem(pathname, guildId);
  const group = findNavGroup(section);
  const isOverview = !section || section.href === "";

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  return (
    <header className="relative z-30 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
      {/* Hamburger (mobile) + breadcrumb */}
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <button
          onClick={onMenuClick}
          aria-label="Otwórz menu"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-300 outline-none transition hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/40 md:hidden"
        >
          <Menu size={18} />
        </button>
        <button
          onClick={() => router.push(`/dashboard/${guildId}`)}
          className="truncate font-medium text-gray-300 outline-none transition hover:text-white focus-visible:text-white"
        >
          {guildName}
        </button>
        {!isOverview && section && (
          <>
            {group && (
              <>
                <ChevronRight size={14} className="shrink-0 text-gray-400" />
                <span className="hidden shrink-0 text-gray-400 sm:inline">
                  {group.label}
                </span>
              </>
            )}
            <ChevronRight size={14} className="shrink-0 text-gray-400" />
            <span className="truncate text-primary">{section.label}</span>
          </>
        )}
      </nav>

      {/* Bell + user + logout */}
      <div className="flex shrink-0 items-center gap-3">
        {user?.isOwner && (
          <Link
            href="/dashboard/admin"
            title="Panel właściciela — wszystkie serwery bota"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/60 text-gray-300 outline-none transition hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ServerCog size={17} />
          </Link>
        )}
        {/* Trigger command palette (⌘K) — odkrywalność + tap na mobile. */}
        <button
          onClick={() => window.dispatchEvent(new Event("jh:cmdk"))}
          title="Szukaj i nawiguj (Ctrl/⌘ K)"
          aria-label="Otwórz wyszukiwarkę poleceń"
          className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 text-gray-400 outline-none transition hover:bg-white/5 hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Search size={16} className="shrink-0" />
          <span className="hidden text-xs lg:inline">Szukaj…</span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 lg:inline">
            ⌘K
          </kbd>
        </button>
        {/* Status bota: na desktopie żyje w sidebarze, w TopBarze tylko na mobile. */}
        <div className="md:hidden">
          <BotStatusBadge />
        </div>
        <NotificationBell guildId={guildId} />
        {user ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card/60 py-1.5 pl-2.5 pr-1.5">
            <Avatar
              src={discordAvatarUrl(user.userId, user.avatar)}
              name={user.displayName ?? user.username}
              size="sm"
            />
            <span className="hidden leading-tight sm:flex sm:flex-col">
              <span className="text-sm font-medium text-gray-200">
                {user.displayName ?? user.username}
              </span>
              <span className="text-xs text-gray-400">@{user.username}</span>
            </span>
            <button
              onClick={handleLogout}
              title="Wyloguj"
              className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-lg border-l border-border text-gray-400 outline-none transition hover:bg-white/5 hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Skeleton className="h-10 w-28 rounded-xl" />
        )}
      </div>
    </header>
  );
}
