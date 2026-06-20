"use client";

import { ScrollText } from "lucide-react";
import { type CSSProperties, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { ModActionBadge } from "@/components/badges";
import { RefreshButton } from "@/components/RefreshButton";
import { SkeletonRow } from "@/components/Skeleton";
import { useModActions } from "@/hooks/queries";
import type { ModActionType } from "@/lib/api";

type FilterKey = "all" | "warn" | "mute" | "kick" | "ban";

const FILTERS: { key: FilterKey; label: string; types: ModActionType[] }[] = [
  { key: "all", label: "Wszystkie", types: [] },
  { key: "warn", label: "Ostrzeżenia", types: ["warn", "clearwarns"] },
  { key: "mute", label: "Wyciszenia", types: ["mute", "unmute"] },
  { key: "kick", label: "Wyrzucenia", types: ["kick"] },
  { key: "ban", label: "Bany", types: ["ban", "unban"] },
];

export function ModLog({ guildId }: { guildId: string }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const actionsQ = useModActions(guildId, 50);
  const actions = actionsQ.data ?? [];

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0]!;
  const shown =
    active.key === "all" ? actions : actions.filter((a) => active.types.includes(a.type));

  return (
    <div className="surface-raised rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" />
          <p className="text-base font-semibold text-white">Dziennik moderacji</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-gray-300 hover:bg-elevated hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
          <RefreshButton
            onClick={() => actionsQ.refetch()}
            loading={actionsQ.isFetching}
          />
        </div>
      </div>

      {actionsQ.isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-border last:border-0">
            <SkeletonRow />
          </div>
        ))
      ) : shown.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-gray-400">
          Brak akcji w tej kategorii.
        </p>
      ) : (
        shown.map((a, i) => (
          <div
            key={a.id}
            style={{ "--i": i } as CSSProperties}
            className="jh-stagger flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 sm:px-6"
          >
            <ModActionBadge
              type={a.type}
              variant="short"
              className="w-16 shrink-0 text-center font-bold"
            />
            <Avatar src={a.avatar} name={a.displayName ?? a.username ?? "?"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">
                <span className="font-semibold">
                  {a.displayName ?? a.username ?? a.userId}
                </span>
                <span className="text-gray-400"> — {a.reason}</span>
              </p>
              <p className="truncate text-xs text-gray-400">
                przez <span className="font-mono">{a.moderatorId}</span>
                {a.extra ? ` · ${a.extra}` : ""}
              </p>
            </div>
            <p className="hidden shrink-0 text-xs text-gray-400 sm:block">
              {new Date(a.createdAt).toLocaleString("pl-PL")}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
