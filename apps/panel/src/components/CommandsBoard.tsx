"use client";

import {
  FlaskConical,
  type LucideIcon,
  Search,
  Settings,
  ShieldAlert,
  Terminal,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { CARD } from "@/lib/cn";
import { COMMAND_CATALOG } from "@/lib/commands";

/** Ikona + kolory per kategoria (jak w mockupie Command Center). */
const CATEGORY_STYLE: Record<string, { icon: LucideIcon; tile: string; badge: string }> =
  {
    user: {
      icon: TrendingUp,
      tile: "bg-emerald-500/10 text-emerald-400",
      badge: "bg-emerald-500/10 text-emerald-400",
    },
    config: {
      icon: Settings,
      tile: "bg-amber-500/10 text-amber-400",
      badge: "bg-amber-500/10 text-amber-400",
    },
    moderation: {
      icon: ShieldAlert,
      tile: "bg-rose-500/10 text-rose-400",
      badge: "bg-rose-500/10 text-rose-400",
    },
    tickets: {
      icon: Ticket,
      tile: "bg-sky-500/10 text-sky-400",
      badge: "bg-sky-500/10 text-sky-400",
    },
    tests: {
      icon: FlaskConical,
      tile: "bg-violet-500/10 text-violet-400",
      badge: "bg-violet-500/10 text-violet-400",
    },
  };

const FALLBACK_STYLE = {
  icon: Terminal,
  tile: "bg-white/5 text-gray-300",
  badge: "bg-white/5 text-gray-400",
};

type Row = {
  name: string;
  desc: string;
  usage?: string;
  permission?: string;
  prefix?: boolean;
  catKey: string;
  catLabel: string;
};

// Spłaszczony katalog — jedna lista przefiltrowana wyszukiwarką i zakładkami.
const ALL_ROWS: Row[] = COMMAND_CATALOG.flatMap((cat) =>
  cat.commands.map((c) => ({
    name: c.name,
    desc: c.desc,
    usage: c.usage,
    permission: c.permission,
    prefix: c.prefix,
    catKey: cat.key,
    catLabel: cat.label,
  })),
);

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "Wszystkie" },
  ...COMMAND_CATALOG.map((c) => ({ key: c.key, label: c.label })),
];

/**
 * Płaska lista komend z wyszukiwarką i zakładkami kategorii. Stateless wobec
 * danych serwera: dostaje zbiór wyłączonych nazw i emituje następny zbiór.
 */
export function CommandsBoard({
  disabled,
  onChange,
}: {
  disabled: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");

  const isEnabled = (name: string) => !disabled.has(name);

  const toggle = (name: string, enabled: boolean) => {
    const next = new Set(disabled);
    if (enabled) next.delete(name);
    else next.add(name);
    onChange(next);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_ROWS.filter((r) => {
      if (tab !== "all" && r.catKey !== tab) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q);
    });
  }, [query, tab]);

  const setAll = (enabled: boolean) => {
    const next = new Set(disabled);
    for (const r of visible) {
      if (enabled) next.delete(r.name);
      else next.add(r.name);
    }
    onChange(next);
  };

  const onCount = visible.filter((r) => isEnabled(r.name)).length;
  const allOn = visible.length > 0 && onCount === visible.length;

  return (
    <div className={`${CARD} flex flex-col`}>
      {/* Pasek narzędzi: wyszukiwarka + przełącznik całej widocznej listy. */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj komendy…"
            className="w-full rounded-lg border border-border bg-elevated py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-primary/50 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setAll(!allOn)}
          disabled={visible.length === 0}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-gray-300 transition hover:text-primary disabled:opacity-40"
        >
          {allOn ? "Wyłącz widoczne" : "Włącz widoczne"}
        </button>
      </div>

      {/* Zakładki kategorii. */}
      <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key
                ? "bg-primary/15 text-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista. */}
      <div className="divide-y divide-white/5">
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            Brak komend pasujących do wyszukiwania.
          </p>
        ) : (
          visible.map((cmd) => {
            const on = isEnabled(cmd.name);
            const style = CATEGORY_STYLE[cmd.catKey] ?? FALLBACK_STYLE;
            const Icon = style.icon;
            return (
              <label
                key={cmd.name}
                className="flex cursor-pointer items-center gap-3 px-5 py-3 transition hover:bg-elevated"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.tile} ${on ? "" : "opacity-50"}`}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`truncate font-mono text-sm ${on ? "text-white" : "text-gray-400 line-through"}`}
                    >
                      /{cmd.name}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.badge}`}
                    >
                      {cmd.catLabel}
                    </span>
                    {cmd.prefix && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        prefiks
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-400">{cmd.desc}</p>
                  {cmd.usage && (
                    <p className="mt-0.5 truncate font-mono text-[10px] text-gray-500">
                      {cmd.usage
                        .split(/(<[^>]+>|\[[^\]]+\])/)
                        .filter(Boolean)
                        .map((part, i) =>
                          part.startsWith("<") ? (
                            <span key={i} className="text-primary/70">
                              {part}
                            </span>
                          ) : part.startsWith("[") ? (
                            <span key={i} className="text-gray-500">
                              {part}
                            </span>
                          ) : (
                            <span key={i}>{part}</span>
                          ),
                        )}
                    </p>
                  )}
                </div>
                {cmd.permission && (
                  <span className="hidden shrink-0 text-xs text-gray-500 sm:block">
                    {cmd.permission}
                  </span>
                )}
                <Switch checked={on} onCheckedChange={(v) => toggle(cmd.name, v)} />
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
