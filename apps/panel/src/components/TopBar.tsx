"use client";

import { ChevronRight, LogOut } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import type { User } from "@/lib/api";
import { getMe, logout } from "@/lib/api";
import { findNavGroup, findNavItem } from "@/lib/nav";

export function TopBar({ guildName }: { guildName: string }) {
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
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/5 bg-[#0f1117]/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      {/* Breadcrumb (pl-9 na mobile robi miejsce na przycisk hamburger) */}
      <nav className="flex min-w-0 items-center gap-1.5 pl-9 text-sm md:pl-0">
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
                <ChevronRight size={14} className="shrink-0 text-gray-600" />
                <span className="hidden shrink-0 text-gray-500 sm:inline">
                  {group.label}
                </span>
              </>
            )}
            <ChevronRight size={14} className="shrink-0 text-gray-600" />
            <span className="truncate text-[#d4a843]">{section.label}</span>
          </>
        )}
      </nav>

      {/* User + logout */}
      <div className="flex shrink-0 items-center gap-3">
        {user ? (
          <>
            <Avatar
              src={
                user.avatar
                  ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`
                  : null
              }
              name={user.username}
              size="sm"
            />
            <span className="hidden text-sm text-gray-300 sm:inline">
              {user.username}
            </span>
          </>
        ) : (
          <Skeleton className="h-8 w-8 rounded-full" />
        )}
        <button
          onClick={handleLogout}
          title="Wyloguj"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 outline-none transition hover:bg-white/5 hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-[#d4a843]/40"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
