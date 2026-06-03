"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { getGuilds } from "@/lib/api";

export default function GuildLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;
  const [guildName, setGuildName] = useState("...");

  useEffect(() => {
    getGuilds()
      .then((guilds) => {
        const guild = guilds.find((g) => g.id === guildId);
        if (guild) setGuildName(guild.name);
      })
      .catch(() => router.replace("/"));
  }, [guildId, router]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117]">
      <Sidebar guildName={guildName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar guildName={guildName} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
