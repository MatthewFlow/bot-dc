"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Crown,
  Gavel,
  Ticket,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { type CSSProperties, useEffect } from "react";

import { Avatar } from "@/components/Avatar";
import { ModActionBadge, TicketStatusBadge } from "@/components/badges";
import { LeaderboardRows } from "@/components/Leaderboard";
import { Skeleton } from "@/components/Skeleton";
import type { LeaderboardEntry, ModAction, Ticket as TicketType } from "@/lib/api";
import {
  fetchGuildStats,
  fetchLeaderboard,
  getMe,
  getModActions,
  getTickets,
  queryKeys,
  TokenExpiredError,
} from "@/lib/api";
import { formatCount as fmt } from "@/lib/format";
import { relativeTime as timeAgo } from "@/lib/time";

const CARD_BASE =
  "surface-raised rounded-xl border border-border bg-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

// ── Statystyki ──────────────────────────────────────────────────────────────

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

// ── Wspólny szkielet sekcji (nagłówek + „zobacz wszystkie") ──────────────────

function SectionCard({
  icon: Icon,
  title,
  seeAllLabel,
  onSeeAll,
  children,
}: {
  icon: typeof Users;
  title: string;
  seeAllLabel?: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`${CARD_BASE} flex flex-col`}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-primary">
            <Icon size={15} />
          </span>
          <p className="text-sm font-semibold text-white">{title}</p>
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-0.5 text-xs text-gray-400 transition hover:text-primary"
          >
            {seeAllLabel ?? "Wszystkie"}
            <ChevronRight size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
        >
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-gray-400">{children}</div>;
}

// ── Najaktywniejsi (leaderboard) ─────────────────────────────────────────────

function TopActive({
  loading,
  entries,
  onSeeAll,
}: {
  loading: boolean;
  entries: LeaderboardEntry[];
  onSeeAll: () => void;
}) {
  return (
    <SectionCard
      icon={Crown}
      title="Najaktywniejsi"
      seeAllLabel="Ranking"
      onSeeAll={onSeeAll}
    >
      <LeaderboardRows entries={entries} loading={loading} rows={5} />
    </SectionCard>
  );
}

// ── Ostatnie tickety ─────────────────────────────────────────────────────────

function RecentTickets({
  loading,
  tickets,
  onSeeAll,
}: {
  loading: boolean;
  tickets: TicketType[];
  onSeeAll: () => void;
}) {
  return (
    <SectionCard icon={Ticket} title="Ostatnie tickety" onSeeAll={onSeeAll}>
      {loading ? (
        <RowsSkeleton />
      ) : tickets.length === 0 ? (
        <EmptyRow>Brak ticketów.</EmptyRow>
      ) : (
        <div className="flex flex-col">
          {tickets.map((t, i) => {
            const resolved = Boolean(t.username);
            const main = t.username ?? t.userId;
            return (
              <div
                key={t.id}
                title={t.subject || undefined}
                style={{ "--i": i } as CSSProperties}
                className="jh-stagger flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
              >
                <Avatar src={t.avatar} name={main} size="sm" />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${
                      resolved ? "font-medium text-white" : "font-mono text-gray-300"
                    }`}
                  >
                    {main}
                  </p>
                  {t.userTag ? (
                    <p className="truncate text-xs text-gray-400">@{t.userTag}</p>
                  ) : (
                    <p className="truncate text-xs text-gray-400">
                      {t.subject || "Zgłoszenie bez tematu"}
                    </p>
                  )}
                </div>
                <TicketStatusBadge status={t.status} className="shrink-0" />
                <span className="hidden w-14 shrink-0 text-right text-xs text-gray-400 sm:block">
                  {timeAgo(t.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ── Aktywność na żywo (dziennik moderacji) ───────────────────────────────────

function ActivityFeed({
  loading,
  actions,
  onSeeAll,
}: {
  loading: boolean;
  actions: ModAction[];
  onSeeAll: () => void;
}) {
  return (
    <SectionCard icon={Activity} title="Aktywność na żywo" onSeeAll={onSeeAll}>
      {loading ? (
        <RowsSkeleton rows={6} />
      ) : actions.length === 0 ? (
        <EmptyRow>Brak akcji moderacyjnych.</EmptyRow>
      ) : (
        <div className="flex flex-col">
          {actions.map((a, i) => {
            const resolved = Boolean(a.displayName || a.username);
            // Główna linia: pseudonim (display name); pod nią mniejszą czcionką @nazwa.
            const main = a.displayName ?? a.username ?? a.userId;
            const handle = a.displayName && a.username ? `@${a.username}` : null;
            return (
              <div
                key={a.id}
                title={a.reason || undefined}
                style={{ "--i": i } as CSSProperties}
                className="jh-stagger flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
              >
                <Avatar src={a.avatar} name={main} size="sm" />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${
                      resolved ? "font-medium text-white" : "font-mono text-gray-300"
                    }`}
                  >
                    {main}
                  </p>
                  {handle && <p className="truncate text-xs text-gray-400">{handle}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <ModActionBadge type={a.type} />
                  <span className="text-xs text-gray-400">{timeAgo(a.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ── Strona ────────────────────────────────────────────────────────────────────

export default function GuildOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;

  const statsQ = useQuery({
    queryKey: queryKeys.stats(guildId),
    queryFn: () => fetchGuildStats(guildId),
  });
  // Imię do powitania — getMe nie jest związane z serwerem (osobny klucz, jak w TopBar).
  const meQ = useQuery({ queryKey: queryKeys.me(), queryFn: getMe });

  // Sekcje poniżej są opcjonalne — błąd któregokolwiek źródła nie blokuje strony.
  const leaderboardQ = useQuery({
    queryKey: queryKeys.leaderboard(guildId, 5),
    queryFn: () => fetchLeaderboard(guildId, 5),
  });
  const actionsQ = useQuery({
    queryKey: queryKeys.modActions(guildId, 6),
    queryFn: () => getModActions(guildId, 6),
  });
  const ticketsQ = useQuery({
    queryKey: queryKeys.tickets(guildId),
    queryFn: () => getTickets(guildId),
    select: (data: TicketType[]) =>
      [...data]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
  });

  // Błąd statystyk (np. brak dostępu do serwera) → powrót do listy serwerów,
  // jak wcześniej robił useGuildLoad. 401 obsługuje już warstwa api (redirect na "/").
  useEffect(() => {
    if (statsQ.isError && !(statsQ.error instanceof TokenExpiredError)) {
      router.replace("/dashboard");
    }
  }, [statsQ.isError, statsQ.error, router]);

  const stats = statsQ.data ?? null;
  const me = meQ.data ?? null;
  const loading = statsQ.isLoading;
  const leaderboard: LeaderboardEntry[] = leaderboardQ.data ?? [];
  const actions: ModAction[] = actionsQ.data ?? [];
  const tickets: TicketType[] = ticketsQ.data ?? [];
  const extraLoading = leaderboardQ.isLoading || actionsQ.isLoading || ticketsQ.isLoading;

  const go = (href: string) => router.push(`/dashboard/${guildId}${href}`);

  const onlineLine =
    stats?.onlineCount != null && stats?.memberCount != null
      ? `${fmt(stats.onlineCount)} z ${fmt(stats.memberCount)} osób jest teraz online.`
      : "wszystko działa stabilnie.";

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Hero — powitanie + status serwera (bez wykresów / przycisków) */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-indigo-700/15 to-amber-500/10 p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl"
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/80">
            ✦ Przegląd
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Witaj z powrotem{me ? `, ${me.displayName ?? me.username}` : ""}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-300">
            Serwer działa stabilnie — {onlineLine}
          </p>
        </div>
      </div>

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

      {/* Najaktywniejsi + ostatnie tickety */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopActive
          loading={extraLoading}
          entries={leaderboard}
          onSeeAll={() => go("/levels")}
        />
        <RecentTickets
          loading={extraLoading}
          tickets={tickets}
          onSeeAll={() => go("/tickets")}
        />
      </div>

      {/* Aktywność na żywo — dziennik moderacji */}
      <ActivityFeed
        loading={extraLoading}
        actions={actions}
        onSeeAll={() => go("/moderation")}
      />
    </div>
  );
}
