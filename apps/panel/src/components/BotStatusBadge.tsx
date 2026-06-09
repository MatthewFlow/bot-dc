"use client";

import { useEffect, useState } from "react";

import { getBotStatus } from "@/lib/api";

/** Czas po polsku „przed chwilą / N min temu / data" dla ostatniego heartbeatu. */
function lastSeenLabel(iso: string | null): string {
  if (!iso) return "brak danych";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "przed chwilą";
  if (min < 60) return `${min} min temu`;
  return new Date(iso).toLocaleString("pl-PL");
}

/** Wskaźnik online/offline bota w TopBarze — odpytuje API co 30 s. */
export function BotStatusBadge() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      getBotStatus()
        .then((s) => {
          if (!active) return;
          setOnline(s.online);
          setLastSeen(s.lastSeen);
        })
        .catch(() => {
          if (active) setOnline(null);
        });
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const cfg =
    online === null
      ? { dot: "bg-gray-500", text: "text-gray-400", label: "Bot…" }
      : online
        ? { dot: "bg-green-500", text: "text-green-400", label: "Bot online" }
        : { dot: "bg-red-500", text: "text-red-400", label: "Bot offline" };

  const title =
    online === null
      ? "Sprawdzanie statusu bota…"
      : online
        ? `Bot jest online · ostatni sygnał ${lastSeenLabel(lastSeen)}`
        : `Bot jest offline · ostatni sygnał ${lastSeenLabel(lastSeen)}`;

  return (
    <div
      title={title}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5"
    >
      <span className="relative flex h-2 w-2">
        {online && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.dot} opacity-60`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
      </span>
      <span className={`hidden text-xs font-medium sm:inline ${cfg.text}`}>
        {cfg.label}
      </span>
    </div>
  );
}
