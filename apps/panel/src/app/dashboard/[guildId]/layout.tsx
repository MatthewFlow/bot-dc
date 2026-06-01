"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/Sidebar";
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
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
