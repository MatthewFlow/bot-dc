"use client";

import { Clock, ShieldOff } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { RefreshButton } from "@/components/RefreshButton";
import { SkeletonRow } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useActivePunishments } from "@/hooks/queries";
import { unbanUser, unmuteUser } from "@/lib/api";
import { CARD } from "@/lib/cn";

/** Ile banów renderujemy — rejestr banów potrafi być ogromny, nie rozdymamy karty. */
const MAX_BANS = 25;

/** Formatuje pozostały czas timeoutu (np. „2d 3h", „1:04:22", „12:30"). */
function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}:${pad(mins)}:${pad(secs)}`;
  return `${mins}:${pad(secs)}`;
}

export function ActivePunishments({
  guildId,
  onChanged,
}: {
  guildId: string;
  onChanged: () => void;
}) {
  const toast = useToast();
  const punishmentsQ = useActivePunishments(guildId);
  const data = punishmentsQ.data;

  // Odliczanie odświeża się co sekundę, póki są aktywne wyciszenia lub temp-bany.
  const [, setTick] = useState(0);
  const needTick =
    (data?.mutes.length ?? 0) > 0 || (data?.bans.some((b) => b.until) ?? false);
  useEffect(() => {
    if (!needTick) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [needTick]);

  const [pending, setPending] = useState<string | null>(null);

  async function lift(kind: "mute" | "ban", userId: string) {
    setPending(userId);
    try {
      if (kind === "mute") await unmuteUser(guildId, userId);
      else await unbanUser(guildId, userId);
      toast(
        kind === "mute" ? "Użytkownik odciszony." : "Użytkownik odbanowany.",
        "success",
      );
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się cofnąć kary.", "error");
    } finally {
      setPending(null);
    }
  }

  const total = (data?.mutes.length ?? 0) + (data?.bans.length ?? 0);
  const now = Date.now();

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <ShieldOff className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-white">Aktywne kary</p>
          {total > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {total}
            </span>
          )}
        </div>
        <RefreshButton
          onClick={() => punishmentsQ.refetch()}
          loading={punishmentsQ.isFetching}
        />
      </div>

      <div className="flex flex-col">
        {punishmentsQ.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-b border-border last:border-0">
              <SkeletonRow />
            </div>
          ))
        ) : total === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            Brak aktywnych kar. Czysto! 🎉
          </p>
        ) : (
          <>
            {data?.mutes.map((m, i) => {
              const remaining = new Date(m.until).getTime() - now;
              return (
                <Row
                  key={`mute-${m.userId}`}
                  index={i}
                  avatar={m.avatar}
                  name={m.displayName ?? m.username ?? m.userId}
                  reason={m.reason ?? "Wyciszenie"}
                  badge={
                    <span className="flex items-center gap-1 rounded-full bg-indigo-400/10 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                      <Clock className="h-3 w-3" />
                      {formatRemaining(remaining)}
                    </span>
                  }
                  actionLabel="Odcisz"
                  pending={pending === m.userId}
                  onAction={() => lift("mute", m.userId)}
                />
              );
            })}
            {data?.bans.slice(0, MAX_BANS).map((b, i) => (
              <Row
                key={`ban-${b.userId}`}
                index={(data?.mutes.length ?? 0) + i}
                avatar={b.avatar}
                name={b.displayName ?? b.username ?? b.userId}
                reason={b.reason ?? "Ban"}
                badge={
                  b.until ? (
                    <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
                      <Clock className="h-3 w-3" />
                      {formatRemaining(new Date(b.until).getTime() - now)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-400">
                      na stałe
                    </span>
                  )
                }
                actionLabel="Odbanuj"
                pending={pending === b.userId}
                onAction={() => lift("ban", b.userId)}
              />
            ))}
            {(data?.bans.length ?? 0) > MAX_BANS && (
              <p className="px-5 py-3 text-center text-xs text-gray-400">
                …i {(data?.bans.length ?? 0) - MAX_BANS} więcej zbanowanych
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  index,
  avatar,
  name,
  reason,
  badge,
  actionLabel,
  pending,
  onAction,
}: {
  index: number;
  avatar: string | null;
  name: string;
  reason: string;
  badge: React.ReactNode;
  actionLabel: string;
  pending: boolean;
  onAction: () => void;
}) {
  return (
    <div
      style={{ "--i": index } as CSSProperties}
      className="jh-stagger flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
    >
      <Avatar src={avatar} name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <p className="truncate text-xs text-gray-400">{reason}</p>
      </div>
      {badge}
      <button
        onClick={onAction}
        disabled={pending}
        className="shrink-0 rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
      >
        {pending ? "…" : actionLabel}
      </button>
    </div>
  );
}
