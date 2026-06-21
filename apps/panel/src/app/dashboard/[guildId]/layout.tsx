"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useGuildEvents } from "@/hooks/useGuildEvents";
import { getGuilds, prefetchGuildData } from "@/lib/api";

export default function GuildLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;
  const [guildName, setGuildName] = useState("...");
  const [guildIcon, setGuildIcon] = useState<string | null>(null);

  // Real-time: odświeżanie statusu bota i aktywności przez SSE (zamiast pollingu).
  useGuildEvents(guildId);

  useEffect(() => {
    // Rozgrzej cache (config/role/kanały) raz przy wejściu na serwer — wtedy
    // przełączanie między podstronami jest natychmiastowe (trafia w cache).
    prefetchGuildData(guildId);

    getGuilds()
      .then((guilds) => {
        const guild = guilds.find((g) => g.id === guildId);
        if (guild) {
          setGuildName(guild.name);
          setGuildIcon(guild.icon);
        }
      })
      .catch(() => router.replace("/"));
  }, [guildId, router]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar guildName={guildName} guildIcon={guildIcon} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar guildName={guildName} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
