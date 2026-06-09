"use client";

import { Switch } from "@/components/ui/switch";
import { COMMAND_CATALOG } from "@/lib/commands";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return <Switch checked={checked} onCheckedChange={onChange} />;
}

const CARD = "surface-raised rounded-xl border border-border bg-card";

/**
 * Presentational board for per-server command enable/disable toggles.
 * Stateless: receives the set of disabled command names and emits the next set.
 */
export function CommandsBoard({
  disabled,
  onChange,
}: {
  disabled: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const isEnabled = (name: string) => !disabled.has(name);

  const toggle = (name: string, enabled: boolean) => {
    const next = new Set(disabled);
    if (enabled) next.delete(name);
    else next.add(name);
    onChange(next);
  };

  const setCategory = (names: string[], enabled: boolean) => {
    const next = new Set(disabled);
    for (const n of names) {
      if (enabled) next.delete(n);
      else next.add(n);
    }
    onChange(next);
  };

  const total = COMMAND_CATALOG.reduce((n, c) => n + c.commands.length, 0);
  const disabledCount = disabled.size;
  const activeCount = total - disabledCount;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-6">
        {COMMAND_CATALOG.map((cat) => {
          const names = cat.commands.map((c) => c.name);
          const onCount = names.filter((n) => isEnabled(n)).length;
          const allOn = onCount === names.length;
          return (
            <div key={cat.key} className={CARD}>
              <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <p className="text-sm font-semibold text-white">{cat.label}</p>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-gray-300">
                    {onCount}/{names.length}
                  </span>
                </div>
                <button
                  onClick={() => setCategory(names, !allOn)}
                  className="text-xs font-medium text-gray-300 transition hover:text-primary"
                >
                  {allOn ? "Wyłącz wszystkie" : "Włącz wszystkie"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-px bg-white/5 sm:grid-cols-2">
                {cat.commands.map((cmd) => {
                  const on = isEnabled(cmd.name);
                  return (
                    <label
                      key={cmd.name}
                      className="flex cursor-pointer items-center justify-between gap-3 bg-card px-5 py-3 transition hover:bg-elevated"
                    >
                      <div className="min-w-0">
                        <p
                          className={`truncate font-mono text-sm ${on ? "text-white" : "text-gray-400 line-through"}`}
                        >
                          /{cmd.name}
                        </p>
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
                      <Toggle checked={on} onChange={(v) => toggle(cmd.name, v)} />
                    </label>
                  );
                })}
                {/* Wyrównanie siatki 2-kolumnowej przy nieparzystej liczbie komend. */}
                {cat.commands.length % 2 === 1 && (
                  <div className="hidden bg-card sm:block" aria-hidden />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-6 lg:w-72">
        <div className={`${CARD} flex items-stretch divide-x divide-white/5`}>
          <div className="flex-1 px-5 py-4">
            <p className="text-2xl font-bold text-white">{activeCount}</p>
            <p className="text-xs text-gray-400">aktywnych komend</p>
          </div>
          <div className="flex-1 px-5 py-4">
            <p
              className={`text-2xl font-bold ${disabledCount ? "text-primary" : "text-gray-400"}`}
            >
              {disabledCount}
            </p>
            <p className="text-xs text-gray-400">wyłączonych</p>
          </div>
        </div>
      </div>
    </div>
  );
}
