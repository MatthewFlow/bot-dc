"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LogOut } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import type { Guild, User } from "@/lib/api";
import { getGuilds, getMe, logout } from "@/lib/api";

function guildIconUrl(guild: Guild) {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
}

function GuildSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-[#1a1f2e] p-4">
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

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1f2e] text-lg font-bold text-[#d4a843]">
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
                <Avatar src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png` : null} name={user.username} size="sm" />
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

        <h2 className="mb-4 text-lg font-semibold text-gray-200">Wybierz serwer</h2>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <GuildSkeleton key={i} />
            ))}
          </div>
        ) : guilds.length === 0 ? (
          <p className="text-gray-500">
            Nie znaleziono serwerów gdzie masz uprawnienia admina.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {guilds.map((guild) => (
              <button
                key={guild.id}
                onClick={() => router.push(`/dashboard/${guild.id}`)}
                className="flex items-center gap-4 rounded-xl border border-white/5 bg-[#1a1f2e] p-4 text-left outline-none transition hover:-translate-y-0.5 hover:border-white/10 hover:bg-[#222838] focus-visible:ring-2 focus-visible:ring-[#d4a843]/40"
              >
                <Avatar src={guildIconUrl(guild)} name={guild.name} size="lg" />
                <span className="font-medium text-white">{guild.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
