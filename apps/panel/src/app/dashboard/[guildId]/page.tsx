"use client";

import { AlertTriangle, Gavel, Ticket, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { GuildStats } from "@/lib/api";
import { getGuildStats } from "@/lib/api";
import { NAV_GROUPS } from "@/lib/nav";

const NF = new Intl.NumberFormat("pl-PL");

/** Sformatuj liczbę; null → „—". */
function fmt(n: number | null | undefined): string {
  return n == null ? "—" : NF.format(n);
}

const CARD_BASE =
  "surface-raised rounded-xl border border-border bg-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={20} />
      </div>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-300">{label}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${CARD_BASE} block p-5 text-left hover:-translate-y-0.5 hover:border-white/10 hover:bg-elevated`}
      >
        {inner}
      </button>
    );
  }
  return <div className={`${CARD_BASE} p-5`}>{inner}</div>;
}

function StatCardSkeleton() {
  return (
    <div className={`${CARD_BASE} p-5`}>
      <Skeleton className="h-10 w-10 rounded-lg" />
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

export default function GuildOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;

  const [stats, setStats] = useState<GuildStats | null>(null);

  const { loading } = useGuildLoad(guildId, (id) => getGuildStats(id), setStats);

  const go = (href: string) => router.push(`/dashboard/${guildId}${href}`);

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Przegląd"
        title="Dashboard"
        description="Najważniejsze informacje o serwerze w jednym miejscu."
        className="mb-0"
      />

      {/* Statystyki */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={Users}
              label="Członkowie"
              value={fmt(stats.memberCount)}
              sub={
                stats.onlineCount != null ? `${fmt(stats.onlineCount)} online` : undefined
              }
              accent="bg-discord/15 text-[#8b93f8]"
            />
            <StatCard
              icon={Gavel}
              label="Bany"
              value={
                stats.banCount != null && stats.banCountCapped
                  ? `${fmt(stats.banCount)}+`
                  : fmt(stats.banCount)
              }
              sub={stats.banCount == null ? "brak uprawnień bota" : undefined}
              accent="bg-red-500/15 text-red-400"
              onClick={() => go("/moderation")}
            />
            <StatCard
              icon={AlertTriangle}
              label="Ostrzeżenia"
              value={fmt(stats.warnCount)}
              accent="bg-yellow-500/15 text-yellow-400"
              onClick={() => go("/moderation")}
            />
            <StatCard
              icon={Ticket}
              label="Tickety"
              value={fmt(stats.tickets.total)}
              sub={`${fmt(stats.tickets.pending)} oczekuje · ${fmt(stats.tickets.open)} w trakcie`}
              accent="bg-primary/15 text-primary"
              onClick={() => go("/tickets")}
            />
          </>
        )}
      </div>

      {/* Szybka nawigacja — pogrupowana w sekcje */}
      <div className="flex flex-col gap-8">
        {NAV_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div key={group.id}>
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <GroupIcon size={13} className="shrink-0" />
                {group.label}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => go(item.href)}
                      className={`${CARD_BASE} flex flex-col gap-2 p-6 text-left hover:-translate-y-0.5 hover:border-white/10 hover:bg-elevated`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-primary">
                        <Icon size={18} />
                      </span>
                      <p className="mt-1 font-semibold text-white">{item.label}</p>
                      <p className="text-sm text-gray-300">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
