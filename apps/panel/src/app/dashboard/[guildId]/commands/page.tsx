"use client";

import { Hash, Power, ShieldCheck, SlidersHorizontal, Terminal } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { CommandsBoard } from "@/components/CommandsBoard";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useGuildConfig } from "@/hooks/queries";
import { useRedirectOnError, useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { GuildConfig } from "@/lib/api";
import { updateGuildConfig } from "@/lib/api";
import { ALL_COMMAND_NAMES } from "@/lib/commands";

function StatCard({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: typeof Hash;
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="surface-raised flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          accent ? "bg-primary/15 text-primary" : "bg-white/5 text-gray-300"
        }`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight text-white">{value}</p>
        <p className="truncate text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function CommandsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [config, setConfig] = useState<GuildConfig>({});
  const [saving, setSaving] = useState(false);

  const configQ = useGuildConfig(guildId);
  const loading = configQ.isLoading;
  useRedirectOnError(configQ.isError, configQ.error);
  const configReady = useSeedOnce(configQ.data, setConfig);

  const disabled = new Set(config.disabledCommands ?? []);
  const setDisabled = (next: Set<string>) =>
    setConfig((c) => ({ ...c, disabledCommands: [...next] }));

  const setPrefix = (v: string) =>
    setConfig((c) => ({ ...c, prefix: v.replace(/\s/g, "").slice(0, 5) }));

  const total = ALL_COMMAND_NAMES.length;
  const disabledCount = disabled.size;
  const activeCount = total - disabledCount;
  const prefix = config.prefix ?? "";

  async function handleSave() {
    setSaving(true);
    try {
      const trimmed = (config.prefix ?? "").trim();
      await updateGuildConfig(guildId, {
        disabledCommands: config.disabledCommands ?? [],
        // Pusty prefiks czyści ustawienie (powrót do samych slash-komend).
        prefix: trimmed ? trimmed : null,
      });
      toast("Zapisano zmiany.", "success");
    } catch {
      toast("Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify({
      disabled: [...(config.disabledCommands ?? [])].sort(),
      prefix: (config.prefix ?? "").trim(),
    }),
    handleSave,
    configReady,
  );

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Command Center"
        icon={SlidersHorizontal}
        title={
          <>
            Komendy <span className="italic text-primary">bota</span>
          </>
        }
        description="Włączaj, konfiguruj i ustaw prefiks komend serwera."
        className="mb-0"
      />

      <HowItWorks
        subtitle="Cztery kroki do pełnej kontroli nad komendami"
        cards={[
          {
            icon: SlidersHorizontal,
            title: "Wpisz komendę",
            text: "Slash-komendy (/) z autouzupełnianiem albo prefiks dla klasycznych.",
          },
          {
            icon: ShieldCheck,
            title: "Sprawdzenie uprawnień",
            text: "Bot weryfikuje rolę i uprawnienia, zanim wykona akcję.",
          },
          {
            icon: Power,
            title: "Włącz / wyłącz",
            text: "Każdą komendę przełączasz suwakiem — wyłączone bot odrzuca.",
          },
          {
            icon: Terminal,
            title: "Ustaw prefiks",
            text: "Prefiks (np. !) dla klasycznych komend level, leaderboard i profile.",
          },
        ]}
      />

      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={SlidersHorizontal} value={total} label="komend ogółem" />
            <StatCard icon={Power} value={activeCount} label="aktywnych" accent />
            <StatCard
              icon={Hash}
              value={disabledCount}
              label="wyłączonych"
              accent={disabledCount > 0}
            />
            <StatCard
              icon={Terminal}
              value={prefix.trim() || "—"}
              label="prefiks komend"
            />
          </div>

          <div className="flex justify-end">
            <SaveButton
              onClick={handleSave}
              saving={saving}
              autoSaveStatus={autoSaveStatus}
              className="px-5 py-2"
            />
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <CommandsBoard disabled={disabled} onChange={setDisabled} />
            </div>

            {/* Prefiks komend klasycznych. */}
            <div className="surface-raised w-full shrink-0 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-6 lg:w-80">
              <div className="mb-1 flex items-center gap-2">
                <Terminal size={16} className="shrink-0 text-primary" />
                <p className="text-sm font-semibold text-white">Prefiks</p>
              </div>
              <p className="mb-4 text-xs text-gray-400">
                Dla klasycznych komend. Slash-komendy (/) działają zawsze, niezależnie od
                prefiksu.
              </p>

              <label className="mb-1.5 block text-xs font-medium text-gray-300">
                Znak / ciąg prefiksu
              </label>
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="!"
                maxLength={5}
                className="w-full rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-sm text-white placeholder:text-gray-500 focus:border-primary/50 focus:outline-none"
              />
              <p className="mt-2 text-xs text-gray-500">
                Przykład:{" "}
                <code className="rounded bg-white/5 px-1 text-primary">
                  {(prefix.trim() || "!") + "level"}
                </code>{" "}
                zadziała jak <code className="rounded bg-white/5 px-1">/level</code>.
                Zostaw puste, by wyłączyć.
              </p>

              <p className="mt-4 text-[11px] leading-relaxed text-gray-500">
                Komendy prefiksowe: <span className="text-gray-400">level</span>,{" "}
                <span className="text-gray-400">leaderboard</span> (alias top),{" "}
                <span className="text-gray-400">profile</span> (alias rank).
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
