"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Award,
  Ban,
  ChevronRight,
  Crown,
  Gavel,
  type LucideIcon,
  MicOff,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  UserMinus,
  Users,
  Zap,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";

import { MOD_ACTION } from "@/components/Badges";
import { LeaderboardRows } from "@/components/Leaderboard";
import { Skeleton } from "@/components/Skeleton";
import { TicketCard } from "@/components/TicketCard";
import { useToast } from "@/components/Toast";
import { useActivity, useGuildStats, useLeaderboard } from "@/hooks/queries";
import type {
  ActivityItem,
  LeaderboardEntry,
  ModActionType,
  Ticket as TicketType,
} from "@/lib/api";
import { closeTicket, getMe, getTickets, queryKeys, TokenExpiredError } from "@/lib/api";
import { CARD } from "@/lib/cn";
import { formatCount as fmt } from "@/lib/format";
import { relativeTime as timeAgo } from "@/lib/time";

const CARD_BASE = `${CARD} transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`;

// ── Statystyki ──────────────────────────────────────────────────────────────

function TrendPill({ value }: { value: number }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        value > 0 ? "bg-primary/10 text-primary" : "bg-white/5 text-gray-500"
      }`}
    >
      {value > 0 ? `↑ +${value}` : "0"}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  trend,
  onClick,
  index = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  /** Przyrost „w tym tygodniu" (badge w prawym górnym rogu). */
  trend?: number;
  onClick?: () => void;
  index?: number;
}) {
  const style = { "--i": index } as CSSProperties;
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon size={20} />
        </div>
        {trend != null && <TrendPill value={trend} />}
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
        style={style}
        className={`jh-stagger ${CARD_BASE} block p-5 text-left hover:bg-elevated`}
      >
        {inner}
      </button>
    );
  }
  return (
    <div style={style} className={`jh-stagger ${CARD_BASE} p-5`}>
      {inner}
    </div>
  );
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
  badge,
  seeAllLabel,
  onSeeAll,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: React.ReactNode;
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
          {badge}
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
  guildId,
  busyId,
  onClose,
  onSeeAll,
}: {
  loading: boolean;
  tickets: TicketType[];
  guildId: string;
  busyId: string | null;
  onClose: (threadId: string) => void;
  onSeeAll: () => void;
}) {
  return (
    <SectionCard icon={Ticket} title="Ostatnie tickety" onSeeAll={onSeeAll}>
      {loading ? (
        <div className="flex flex-col gap-2.5 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyRow>Brak ticketów.</EmptyRow>
      ) : (
        <div className="flex flex-col gap-2.5 p-4">
          {tickets.map((t, i) => (
            <TicketCard
              key={t.id}
              ticket={t}
              index={i}
              guildId={guildId}
              busy={busyId === t.threadId}
              onClose={() => onClose(t.threadId)}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ── Aktywność na żywo (moderacja + level-upy + role) ─────────────────────────

// Ikona + opis per typ akcji; kolor kafelka bierzemy z `MOD_ACTION` (badges.tsx),
// żeby nie duplikować palety.
const MOD_VISUAL: Record<ModActionType, { icon: LucideIcon; verb: string }> = {
  warn: { icon: ShieldAlert, verb: "otrzymał ostrzeżenie" },
  mute: { icon: MicOff, verb: "został wyciszony" },
  unmute: { icon: MicOff, verb: "— wyciszenie zdjęte" },
  kick: { icon: UserMinus, verb: "został wyrzucony" },
  ban: { icon: Ban, verb: "został zbanowany" },
  unban: { icon: Ban, verb: "— ban zdjęty" },
  clearwarns: { icon: ShieldCheck, verb: "— ostrzeżenia wyczyszczone" },
};

/** Ikona + kolor + opis wiersza zależnie od rodzaju zdarzenia. */
function activityVisual(item: ActivityItem): {
  Icon: LucideIcon;
  cls: string;
  line: React.ReactNode;
} {
  const name = item.displayName ?? item.username ?? item.userId;
  const strong = <strong className="font-semibold text-white">{name}</strong>;

  if (item.kind === "levelup") {
    return {
      Icon: TrendingUp,
      cls: "bg-green-400/10 text-green-400",
      line: (
        <>
          {strong} awansował na poziom {item.level ?? "?"}
        </>
      ),
    };
  }
  if (item.kind === "role") {
    return {
      Icon: Award,
      cls: "bg-violet-400/10 text-violet-300",
      line: (
        <>
          {strong} otrzymał rolę{" "}
          <strong className="text-primary">{item.roleName ?? "—"}</strong>
        </>
      ),
    };
  }
  const type = item.modType ?? "warn";
  const v = MOD_VISUAL[type];
  return {
    Icon: v.icon,
    cls: MOD_ACTION[type].cls,
    line: (
      <>
        {strong} {v.verb}
      </>
    ),
  };
}

function ActivityFeed({
  loading,
  items,
  onSeeAll,
}: {
  loading: boolean;
  items: ActivityItem[];
  onSeeAll: () => void;
}) {
  return (
    <SectionCard
      icon={Activity}
      title="Aktywność na żywo"
      badge={
        <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          Live
        </span>
      }
      seeAllLabel="Wszystkie"
      onSeeAll={onSeeAll}
    >
      {loading ? (
        <RowsSkeleton rows={6} />
      ) : items.length === 0 ? (
        <EmptyRow>Brak ostatniej aktywności.</EmptyRow>
      ) : (
        <div className="flex flex-col">
          {items.map((item, i) => {
            const { Icon, cls, line } = activityVisual(item);
            const title = item.kind === "mod" ? item.reason || undefined : undefined;
            return (
              <div
                key={item.id}
                title={title}
                style={{ "--i": i } as CSSProperties}
                className="jh-stagger flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cls}`}
                >
                  <Icon className="size-4" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-gray-300">{line}</p>
                <span className="shrink-0 text-xs text-gray-400">
                  {timeAgo(item.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ── Szybkie akcje (skróty do modułów) ────────────────────────────────────────

const QUICK_ACTIONS: { icon: LucideIcon; label: string; desc: string; href: string }[] = [
  { icon: Sparkles, label: "Panel ról", desc: "Self-role", href: "/roles" },
  { icon: Gavel, label: "Moderacja", desc: "Ostrzeżenia, bany", href: "/moderation" },
  { icon: Ticket, label: "Tickety", desc: "Zgłoszenia ekipy", href: "/tickets" },
  { icon: ShieldBan, label: "Auto-moderacja", desc: "Filtry treści", href: "/automod" },
];

function QuickActions({ onGo }: { onGo: (href: string) => void }) {
  return (
    <div className={`${CARD_BASE} flex flex-col`}>
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-primary">
          <Zap size={15} />
        </span>
        <p className="text-sm font-semibold text-white">Szybkie akcje</p>
      </div>
      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.href}
            onClick={() => onGo(a.href)}
            className="surface-raised flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-3 text-left transition hover:border-primary/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <a.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{a.label}</p>
              <p className="truncate text-xs text-gray-400">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Strona ────────────────────────────────────────────────────────────────────

export default function GuildOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();
  const [closingTicket, setClosingTicket] = useState<string | null>(null);

  const statsQ = useGuildStats(guildId);
  // Imię do powitania — getMe nie jest związane z serwerem (osobny klucz, jak w TopBar).
  const meQ = useQuery({ queryKey: queryKeys.me(), queryFn: getMe });

  // Sekcje poniżej są opcjonalne — błąd któregokolwiek źródła nie blokuje strony.
  const leaderboardQ = useLeaderboard(guildId, 5);
  const activityQ = useActivity(guildId, 8);
  const ticketsQ = useQuery({
    queryKey: queryKeys.tickets(guildId),
    queryFn: () => getTickets(guildId),
    select: (data: TicketType[]) =>
      [...data]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
  });

  // Błąd statystyk (np. brak dostępu do serwera) → powrót do listy serwerów.
  // 401 obsługuje już warstwa api (redirect na "/").
  useEffect(() => {
    if (statsQ.isError && !(statsQ.error instanceof TokenExpiredError)) {
      router.replace("/dashboard");
    }
  }, [statsQ.isError, statsQ.error, router]);

  const stats = statsQ.data ?? null;
  const me = meQ.data ?? null;
  const loading = statsQ.isLoading;
  const leaderboard: LeaderboardEntry[] = leaderboardQ.data ?? [];
  const activity: ActivityItem[] = activityQ.data ?? [];
  const tickets: TicketType[] = ticketsQ.data ?? [];

  const go = (href: string) => router.push(`/dashboard/${guildId}${href}`);

  async function handleCloseTicket(threadId: string) {
    setClosingTicket(threadId);
    try {
      await closeTicket(guildId, threadId);
      await ticketsQ.refetch();
      toast("Ticket zamknięty.", "success");
    } catch {
      toast("Nie udało się zamknąć ticketu.", "error");
    } finally {
      setClosingTicket(null);
    }
  }

  const onlineLine =
    stats?.onlineCount != null && stats?.memberCount != null
      ? `${fmt(stats.onlineCount)} z ${fmt(stats.memberCount)} osób jest teraz online.`
      : "wszystko działa stabilnie.";

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Hero — powitanie + status serwera */}
      <div className="jh-sheen relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-indigo-700/15 to-amber-500/10 p-6 sm:p-8">
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
              index={0}
              icon={Users}
              label="Członkowie"
              value={fmt(stats.memberCount)}
              sub={
                stats.onlineCount != null ? `${fmt(stats.onlineCount)} online` : undefined
              }
              accent="bg-discord/15 text-[#8b93f8]"
            />
            <StatCard
              index={1}
              icon={Gavel}
              label="Bany"
              value={
                stats.banCount != null && stats.banCountCapped
                  ? `${fmt(stats.banCount)}+`
                  : fmt(stats.banCount)
              }
              sub={stats.banCount == null ? "brak uprawnień bota" : undefined}
              trend={stats.trends?.bans}
              accent="bg-red-500/15 text-red-400"
              onClick={() => go("/moderation")}
            />
            <StatCard
              index={2}
              icon={AlertTriangle}
              label="Ostrzeżenia"
              value={fmt(stats.warnCount)}
              trend={stats.trends?.warns}
              accent="bg-yellow-500/15 text-yellow-400"
              onClick={() => go("/moderation")}
            />
            <StatCard
              index={3}
              icon={Ticket}
              label="Tickety"
              value={fmt(stats.tickets.total)}
              sub={`${fmt(stats.tickets.pending)} oczekuje · ${fmt(stats.tickets.open)} w trakcie`}
              trend={stats.trends?.tickets}
              accent="bg-primary/15 text-primary"
              onClick={() => go("/tickets")}
            />
          </>
        )}
      </div>

      {/* Aktywność na żywo + szybkie akcje */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <ActivityFeed
            loading={activityQ.isLoading}
            items={activity}
            onSeeAll={() => go("/moderation")}
          />
        </div>
        <div className="w-full lg:w-80 lg:shrink-0">
          <QuickActions onGo={go} />
        </div>
      </div>

      {/* Najaktywniejsi + ostatnie tickety */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopActive
          loading={leaderboardQ.isLoading}
          entries={leaderboard}
          onSeeAll={() => go("/levels")}
        />
        <RecentTickets
          loading={ticketsQ.isLoading}
          tickets={tickets}
          guildId={guildId}
          busyId={closingTicket}
          onClose={handleCloseTicket}
          onSeeAll={() => go("/tickets")}
        />
      </div>
    </div>
  );
}
