"use client";

import { ChevronRight, LogOut, Plus, Search, ServerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import type { Guild, User } from "@/lib/api";
import { getGuilds, getMe, logout } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
const INVITE_URL = `${API_URL}/auth/invite`;

function guildIconUrl(guild: Guild) {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
}

function GuildSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-[#1a1f2e] p-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([getMe(), getGuilds()])
      .then(([me, g]) => {
        setUser(me);
        setGuilds(g);
      })
      .catch((e) => {
        console.error("Dashboard error:", e);
        router.replace("/");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? guilds.filter((g) => g.name.toLowerCase().includes(q)) : guilds;
  }, [guilds, query]);

  return (
    <main className="relative min-h-screen overflow-hidden p-4 sm:p-6 lg:p-8">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Topbar */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#1a1f2e] text-lg font-bold text-[#d4a843]">
              JH
            </div>
            <h1 className="text-xl font-bold text-white">Jurassic Haven</h1>
          </div>

          {loading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : (
            user && (
              <div className="flex items-center gap-3">
                <Avatar
                  src={
                    user.avatar
                      ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`
                      : null
                  }
                  name={user.username}
                  size="sm"
                />
                <span className="text-sm text-gray-300">{user.username}</span>
                <button
                  onClick={async () => {
                    await logout();
                    router.replace("/");
                  }}
                  title="Wyloguj"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 outline-none transition hover:bg-white/5 hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-[#d4a843]/40"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )
          )}
        </div>

        {/* Heading + search */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Twoje serwery
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              Wybierz serwer
              {!loading && guilds.length > 0 && (
                <span className="ml-2 text-base font-medium text-gray-500">
                  {guilds.length}
                </span>
              )}
            </h2>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            {!loading && guilds.length > 6 && (
              <div className="relative flex-1 sm:w-64 sm:flex-none">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Szukaj serwera…"
                  className="w-full rounded-lg border border-white/5 bg-[#1a1f2e] py-2 pl-9 pr-3 text-sm text-white outline-none transition focus:border-white/10 focus:ring-2 focus:ring-[#d4a843]/40"
                />
              </div>
            )}
            <a
              href={INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-2 rounded-lg bg-[#d4a843] px-4 py-2 text-sm font-semibold text-black outline-none transition hover:-translate-y-0.5 hover:bg-[#c49b3a] focus-visible:ring-2 focus-visible:ring-[#d4a843]/40"
            >
              <Plus size={16} />
              Dodaj serwer
            </a>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <GuildSkeleton key={i} />
            ))}
          </div>
        ) : guilds.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-[#1a1f2e] px-6 py-16 text-center">
            <ServerOff size={32} className="text-gray-600" />
            <p className="text-sm font-medium text-gray-300">
              Brak serwerów do zarządzania
            </p>
            <p className="max-w-sm text-xs text-gray-500">
              Nie znaleziono serwerów, na których masz uprawnienia administratora. Dodaj bota
              na serwer lub poproś właściciela o rolę administratora.
            </p>
            <a
              href={INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-2 rounded-lg bg-[#d4a843] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#c49b3a]"
            >
              <Plus size={16} />
              Dodaj serwer
            </a>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-[#1a1f2e] px-6 py-12 text-center text-sm text-gray-500">
            Brak serwerów pasujących do „{query}”.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {filtered.map((guild) => (
              <button
                key={guild.id}
                onClick={() => router.push(`/dashboard/${guild.id}`)}
                className="group flex items-center gap-4 rounded-xl border border-white/5 bg-[#1a1f2e] p-4 text-left outline-none transition hover:-translate-y-0.5 hover:border-white/10 hover:bg-[#222838] focus-visible:ring-2 focus-visible:ring-[#d4a843]/40"
              >
                <Avatar src={guildIconUrl(guild)} name={guild.name} size="lg" />
                <span className="min-w-0 flex-1 truncate font-medium text-white">
                  {guild.name}
                </span>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-[#d4a843]"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
