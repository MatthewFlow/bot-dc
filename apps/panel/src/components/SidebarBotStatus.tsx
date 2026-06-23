"use client";

import { useBotStatus } from "@/hooks/queries";
import { formatUptime } from "@/lib/time";

/**
 * Karta statusu bota w sidebarze (desktop). Pulsująca kropka + „Bot online/offline",
 * uptime pod spodem i ping (ms) po prawej. Trójstan: dopóki nie znamy statusu (load
 * lub błąd) pokazujemy neutralne „Sprawdzanie…" zamiast fałszywego „offline".
 */
export function SidebarBotStatus() {
  const { data, isLoading, isError } = useBotStatus(true);
  const online = isLoading || isError ? null : (data?.online ?? false);
  const ping = data?.ping ?? null;

  const dot = online === null ? "bg-gray-500" : online ? "bg-green-500" : "bg-red-500";
  const text =
    online === null ? "text-gray-400" : online ? "text-green-400" : "text-red-400";
  const label = online === null ? "Sprawdzanie…" : online ? "Bot online" : "Bot offline";

  return (
    <div className="rounded-xl border border-border bg-card/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {online && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
          </span>
          <span className={`truncate text-sm font-medium ${text}`}>{label}</span>
        </span>
        {online !== null && ping != null && (
          <span className="shrink-0 text-xs font-medium text-amber-400">{ping}ms</span>
        )}
      </div>
      {online && data?.startedAt && (
        <p className="mt-1 pl-[18px] text-xs text-gray-400">
          Uptime {formatUptime(data.startedAt)}
        </p>
      )}
    </div>
  );
}
