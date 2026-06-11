import { type CSSProperties } from "react";

import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import type { LeaderboardEntry } from "@/lib/api";
import { formatNumber } from "@/lib/format";

/**
 * Wiersze rankingu XP — wspólny komponent dla przeglądu („Najaktywniejsi")
 * i strony levelowania. Avatar + pseudonim/@username + pasek postępu + XP/level.
 */
export function LeaderboardRows({
  entries,
  loading = false,
  rows = 5,
  emptyLabel = "Brak danych XP na tym serwerze.",
}: {
  entries: LeaderboardEntry[];
  loading?: boolean;
  rows?: number;
  emptyLabel?: string;
}) {
  if (loading) {
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

  if (entries.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-gray-400">{emptyLabel}</div>
    );
  }

  const maxXp = Math.max(...entries.map((e) => e.xp), 1);

  return (
    <div className="flex flex-col">
      {entries.map((e, i) => (
        <div
          key={e.userId}
          style={{ "--i": i } as CSSProperties}
          className="jh-stagger flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
        >
          <span
            className={`w-5 shrink-0 text-center text-sm font-bold ${
              e.position === 1 ? "text-primary" : "text-gray-400"
            }`}
          >
            {e.position}
          </span>
          <Avatar src={e.avatar} name={e.displayName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{e.displayName}</p>
            {e.username && (
              <p className="truncate text-xs text-gray-400">@{e.username}</p>
            )}
          </div>
          <div className="hidden w-24 sm:block">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-fuchsia-500"
                style={{ width: `${Math.max(6, (e.xp / maxXp) * 100)}%` }}
              />
            </div>
          </div>
          <div className="w-16 shrink-0 text-right">
            <p className="text-sm font-semibold text-gray-200">{formatNumber(e.xp)}</p>
            <p className="text-xs text-gray-400">Lv. {e.level}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
