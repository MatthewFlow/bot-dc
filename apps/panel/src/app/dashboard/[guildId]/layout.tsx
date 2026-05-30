"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { getGuilds } from "@/lib/api";

export default function GuildLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;
  const [guildName, setGuildName] = useState("...");

  useEffect(() => {
    const token = localStorage.getItem("jh_token");
    if (!token) {
      router.replace("/");
      return;
    }

    getGuilds(token)
      .then((guilds) => {
        const guild = guilds.find((g) => g.id === guildId);
        if (guild) setGuildName(guild.name);
      })
      .catch(() => {});
  }, [guildId, router]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117]">
      <Sidebar guildName={guildName} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
