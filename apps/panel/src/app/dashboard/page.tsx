"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/Skeleton";
import type { Guild, User } from "@/lib/api";
import { getGuilds, getMe } from "@/lib/api";

function guildIconUrl(guild: Guild) {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
}

function avatarUrl(user: User) {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`;
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
    const token = localStorage.getItem("jh_token");
    if (!token) {
      router.replace("/");
      return;
    }

    Promise.all([getMe(token), getGuilds(token)])
      .then(([me, g]) => {
        setUser(me);
        setGuilds(g);
      })
      .catch((e) => {
        console.error("Dashboard error:", e);
        localStorage.removeItem("jh_token");
        router.replace("/");
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
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
                {avatarUrl(user) ? (
                  <img
                    src={avatarUrl(user)!}
                    alt={user.username}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1f2e] text-sm font-bold">
                    {user.username[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-300">{user.username}</span>
                <button
                  onClick={() => {
                    localStorage.removeItem("jh_token");
                    router.replace("/");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-300"
                >
                  Logout
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
                className="flex items-center gap-4 rounded-xl bg-[#1a1f2e] p-4 text-left transition hover:bg-[#222838]"
              >
                {guildIconUrl(guild) ? (
                  <img
                    src={guildIconUrl(guild)!}
                    alt={guild.name}
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2a2f3e] text-lg font-bold text-gray-300">
                    {guild.name[0]?.toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-white">{guild.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
