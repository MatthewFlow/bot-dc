"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GuildOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;

  useEffect(() => {
    const token = localStorage.getItem("jh_token");
    if (!token) router.replace("/");
  }, [router]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          Przegląd
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            label: "Welcome / Goodbye",
            desc: "Ustaw kanały powitalne i pożegnalne",
            href: `/dashboard/${guildId}/welcome`,
            icon: "👋",
          },
          {
            label: "Auto-role",
            desc: "Konfiguruj progi ról za XP",
            href: `/dashboard/${guildId}/autorole`,
            icon: "🎭",
          },
          {
            label: "Levelowanie",
            desc: "System XP i poziomów",
            href: `/dashboard/${guildId}/levels`,
            icon: "📈",
          },
        ].map((item) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="flex flex-col gap-2 rounded-xl bg-[#1a1f2e] p-6 text-left transition hover:bg-[#222838]"
          >
            <span className="text-2xl">{item.icon}</span>
            <p className="font-semibold text-white">{item.label}</p>
            <p className="text-sm text-gray-400">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
