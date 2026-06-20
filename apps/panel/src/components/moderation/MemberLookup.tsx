"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/Avatar";
import { useMemberSearch } from "@/hooks/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { MemberSearchResult } from "@/lib/api";

/**
 * Wyszukiwarka członka po nazwie / pseudonimie / ID. Po wybraniu pokazuje wybranego
 * członka jako „chip" z możliwością zmiany. Współdzielona przez modal akcji i Kartę członka.
 */
export function MemberLookup({
  guildId,
  value,
  onSelect,
  autoFocus,
}: {
  guildId: string;
  value: MemberSearchResult | null;
  onSelect: (member: MemberSearchResult | null) => void;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q.trim(), 300);
  const searchQ = useMemberSearch(guildId, debounced);
  const results = searchQ.data ?? [];

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
        <Avatar src={value.avatar} name={value.displayName ?? value.username ?? "?"} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {value.displayName ?? value.username ?? value.userId}
          </p>
          <p className="truncate font-mono text-xs text-gray-400">{value.userId}</p>
        </div>
        <button
          onClick={() => onSelect(null)}
          className="shrink-0 rounded-md p-1.5 text-gray-400 transition hover:bg-elevated hover:text-white"
          aria-label="Zmień użytkownika"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nazwa, pseudonim lub ID użytkownika…"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
        />
      </div>

      {debounced.length >= 2 && (
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-background">
          {searchQ.isLoading ? (
            <p className="px-3 py-3 text-center text-xs text-gray-400">Szukam…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-gray-400">
              Brak wyników dla „{debounced}”.
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto">
              {results.map((m) => (
                <li key={m.userId}>
                  <button
                    onClick={() => {
                      onSelect(m);
                      setQ("");
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-elevated"
                  >
                    <Avatar src={m.avatar} name={m.displayName ?? m.username ?? "?"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">
                        {m.displayName ?? m.username ?? m.userId}
                      </p>
                      <p className="truncate font-mono text-xs text-gray-400">
                        {m.userId}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
