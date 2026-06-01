"use client";

import { useParams, useRouter } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";

export default function GuildOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader category="Przegląd" title="Dashboard" description="" />

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
