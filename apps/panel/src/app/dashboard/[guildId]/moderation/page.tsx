"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  Clock,
  MicOff,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";

import { ChannelField } from "@/components/ChannelField";
import { HowItWorks } from "@/components/HowItWorks";
import {
  PUNISH_META,
  PUNISH_ORDER,
  type PunishKind,
} from "@/components/moderation/actionMeta";
import { ActivePunishments } from "@/components/moderation/ActivePunishments";
import { MemberCard } from "@/components/moderation/MemberCard";
import { ModActionDialog } from "@/components/moderation/ModActionDialog";
import { ModLog } from "@/components/moderation/ModLog";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { NumberField } from "@/components/ui/NumberField";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { useActivePunishments, useChannels, useModStats } from "@/hooks/queries";
import { useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useConfigDraft } from "@/hooks/useConfigDraft";
import type { Channel, MemberSearchResult } from "@/lib/api";
import { queryKeys } from "@/lib/api";
import { CARD } from "@/lib/cn";

type DialogState = { kind: PunishKind; member: MemberSearchResult | null };

export default function ModerationPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const qc = useQueryClient();

  const { config, setConfig, saving, loading, configReady, saveConfig } =
    useConfigDraft(guildId);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const channelsQ = useChannels(guildId);
  useSeedOnce(channelsQ.data, setChannels);

  /** Po każdej akcji odśwież statystyki, aktywne kary, dziennik i karty użytkowników. */
  const refreshAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.modStats(guildId) });
    qc.invalidateQueries({ queryKey: queryKeys.activePunishments(guildId) });
    qc.invalidateQueries({ queryKey: ["mod-actions", guildId] });
    qc.invalidateQueries({ queryKey: ["member-history", guildId] });
    qc.invalidateQueries({ queryKey: ["member-profile", guildId] });
    qc.invalidateQueries({ queryKey: ["warnings", guildId] });
  }, [qc, guildId]);

  const handleSave = () =>
    saveConfig({
      modLogChannelId: config.modLogChannelId,
      dmOnPunish: config.dmOnPunish ?? false,
      autoBanThreshold: config.autoBanThreshold ?? 0,
      warnDecayDays: config.warnDecayDays ?? 0,
    });

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify({
      modLogChannelId: config.modLogChannelId ?? "",
      dmOnPunish: config.dmOnPunish ?? false,
      autoBanThreshold: config.autoBanThreshold ?? 0,
      warnDecayDays: config.warnDecayDays ?? 0,
    }),
    handleSave,
    configReady,
  );

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Bezpieczeństwo"
        icon={ShieldAlert}
        title={
          <>
            Centrum <span className="italic text-primary">moderacji</span>
          </>
        }
        description="Ostrzeżenia, wyciszenia, bany i pełna historia działań ekipy."
        className="mb-0"
      />

      <HowItWorks
        subtitle="Cztery kroki do uporządkowanej moderacji"
        cards={[
          {
            icon: Search,
            title: "Znajdź członka",
            text: "Wyszukaj użytkownika, by zobaczyć pełną historię ostrzeżeń, wyciszeń i banów.",
          },
          {
            icon: ShieldAlert,
            title: "Zastosuj karę",
            text: "Ostrzeż, wycisz, wyrzuć lub zbanuj — jednym kliknięciem albo komendą.",
          },
          {
            icon: Clock,
            title: "Kary czasowe",
            text: "Wyciszenia wygasają same; aktywne kary widzisz z odliczaniem czasu.",
          },
          {
            icon: ScrollText,
            title: "Pełny mod-log",
            text: "Każda akcja trafia do logu z powodem, autorem i znacznikiem czasu.",
          },
        ]}
      />

      <ModStatsBar guildId={guildId} />

      {/* Szybkie akcje */}
      <div className={`${CARD} p-5`}>
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-white">Szybkie akcje</p>
            <p className="text-xs text-gray-400">Najczęstsze działania moderacyjne</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PUNISH_ORDER.map((kind) => {
            const meta = PUNISH_META[kind];
            return (
              <button
                key={kind}
                onClick={() => setDialog({ kind, member: null })}
                className="surface-raised group flex items-center gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 text-left transition hover:border-primary/40"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.iconCls}`}
                >
                  <meta.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{meta.label}</p>
                  <p className="truncate font-mono text-xs text-gray-400">
                    {meta.command}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <MemberCard
              guildId={guildId}
              onAction={(kind, member) => setDialog({ kind, member })}
              onChanged={refreshAll}
            />
          </div>

          <div className="flex w-full flex-col gap-6 lg:w-96 lg:shrink-0">
            <ActivePunishments guildId={guildId} onChanged={refreshAll} />

            {/* Ustawienia */}
            <div className={CARD}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-white">Ustawienia</p>
                </div>
                <SaveButton
                  onClick={handleSave}
                  saving={saving}
                  autoSaveStatus={autoSaveStatus}
                  className="px-4 py-1.5 text-xs"
                />
              </div>

              <div className="flex flex-col gap-5 p-5">
                <ChannelField
                  label="Kanał logów moderacyjnych"
                  value={config.modLogChannelId ?? ""}
                  onChange={(v) => setConfig((c) => ({ ...c, modLogChannelId: v }))}
                  channels={channels}
                  onChannelsChange={setChannels}
                  guildId={guildId}
                  defaultName="mod-logi"
                  hint="Tutaj trafiają logi: warn, mute, kick, ban. Audyt zapisuje się też do bazy."
                />

                <ToggleRow
                  label="DM przy karze"
                  desc="Informuj użytkownika o nałożonej karze."
                  checked={config.dmOnPunish ?? false}
                  onChange={(v) => setConfig((c) => ({ ...c, dmOnPunish: v }))}
                />

                <div>
                  <ToggleRow
                    label="Auto-ban po ostrzeżeniach"
                    desc="Eskaluj automatycznie po przekroczeniu progu."
                    checked={(config.autoBanThreshold ?? 0) > 0}
                    onChange={(v) =>
                      setConfig((c) => ({ ...c, autoBanThreshold: v ? 5 : 0 }))
                    }
                  />
                  {(config.autoBanThreshold ?? 0) > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Próg:</span>
                      <NumberField
                        ariaLabel="Próg ostrzeżeń do auto-bana"
                        min={1}
                        max={20}
                        value={config.autoBanThreshold ?? 5}
                        onChange={(v) =>
                          setConfig((c) => ({
                            ...c,
                            autoBanThreshold: Math.min(20, Math.max(1, v || 1)),
                          }))
                        }
                      />
                      <span className="text-xs text-gray-400">ostrzeżeń</span>
                    </div>
                  )}
                </div>

                <div>
                  <ToggleRow
                    label="Wygasanie ostrzeżeń"
                    desc="Stare ostrzeżenia znikają z licznika (audyt zostaje)."
                    checked={(config.warnDecayDays ?? 0) > 0}
                    onChange={(v) =>
                      setConfig((c) => ({ ...c, warnDecayDays: v ? 30 : 0 }))
                    }
                  />
                  {(config.warnDecayDays ?? 0) > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Po:</span>
                      <NumberField
                        ariaLabel="Dni do wygaśnięcia ostrzeżeń"
                        min={1}
                        max={365}
                        value={config.warnDecayDays ?? 30}
                        onChange={(v) =>
                          setConfig((c) => ({
                            ...c,
                            warnDecayDays: Math.min(365, Math.max(1, v || 1)),
                          }))
                        }
                      />
                      <span className="text-xs text-gray-400">dniach</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModLog guildId={guildId} />

      {dialog && (
        <ModActionDialog
          guildId={guildId}
          kind={dialog.kind}
          presetMember={dialog.member}
          onClose={() => setDialog(null)}
          onDone={refreshAll}
        />
      )}
    </div>
  );
}

// ── Pasek statystyk ───────────────────────────────────────────────────────────

function ModStatsBar({ guildId }: { guildId: string }) {
  const statsQ = useModStats(guildId);
  // „Wyciszeni teraz" liczymy z aktywnych kar — ta sama lista zasila kartę poniżej,
  // więc nie pobieramy listy członków drugi raz (TanStack dedupuje po kluczu).
  const punishmentsQ = useActivePunishments(guildId);
  const s = statsQ.data;
  const fmt = (v: number | null | undefined) => (v == null ? "—" : String(v));

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={AlertTriangle}
        value={fmt(s?.activeWarnings)}
        label="Aktywne ostrzeżenia"
        cls="bg-yellow-400/10 text-yellow-400"
        loading={statsQ.isLoading}
      />
      <StatCard
        icon={MicOff}
        value={fmt(punishmentsQ.data?.mutes.length)}
        label="Wyciszeni teraz"
        cls="bg-indigo-400/10 text-indigo-400"
        loading={punishmentsQ.isLoading}
      />
      <StatCard
        icon={Ban}
        value={fmt(s?.bansThisWeek)}
        label="Bany w tym tygodniu"
        cls="bg-red-500/10 text-red-400"
        loading={statsQ.isLoading}
      />
      <StatCard
        icon={ShieldCheck}
        value={fmt(s?.automodActions)}
        label="Akcje automod (7 dni)"
        cls="bg-green-400/10 text-green-400"
        loading={statsQ.isLoading}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  cls,
  loading,
}: {
  icon: typeof AlertTriangle;
  value: string;
  label: string;
  cls: string;
  loading?: boolean;
}) {
  return (
    <div className="surface-raised flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cls}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        {loading ? (
          <Skeleton className="h-5 w-8 rounded" />
        ) : (
          <p className="text-lg font-bold leading-tight text-white">{value}</p>
        )}
        <p className="truncate text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}
