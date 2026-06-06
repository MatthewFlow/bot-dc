"use client";

import { RotateCw, Search, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { ConfirmModal } from "@/components/confirmModal";
import { CreateChannelButton } from "@/components/CreateChannelButton";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { Channel, GuildConfig, ModAction, ModActionType, Warn } from "@/lib/api";
import {
  clearWarnings,
  getChannels,
  getGuildConfig,
  getModActions,
  getWarnings,
  updateGuildConfig,
} from "@/lib/api";

function ModSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div>
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

const ACTION_COLORS: Record<string, string> = {
  warn: "text-yellow-400 bg-yellow-400/10",
  mute: "text-indigo-400 bg-indigo-400/10",
  kick: "text-red-400 bg-red-400/10",
  ban: "text-red-600 bg-red-600/10",
};

const ACTION_META: Record<ModActionType, { label: string; cls: string }> = {
  warn: { label: "Warn", cls: "text-yellow-400 bg-yellow-400/10" },
  mute: { label: "Mute", cls: "text-indigo-400 bg-indigo-400/10" },
  unmute: { label: "Unmute", cls: "text-green-400 bg-green-400/10" },
  kick: { label: "Kick", cls: "text-red-400 bg-red-400/10" },
  ban: { label: "Ban", cls: "text-red-500 bg-red-500/10" },
  clearwarns: { label: "Clear", cls: "text-gray-400 bg-gray-400/10" },
};

export default function ModerationPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [config, setConfig] = useState<GuildConfig>({});
  const [channels, setChannels] = useState<Channel[]>([]);
  const [saving, setSaving] = useState(false);

  const [searchId, setSearchId] = useState("");
  const [searchedId, setSearchedId] = useState<string | null>(null);
  const [warns, setWarns] = useState<Warn[]>([]);
  const [warnsLoading, setWarnsLoading] = useState(false);
  const [pendingClear, setPendingClear] = useState(false);

  const [actions, setActions] = useState<ModAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);

  const { loading } = useGuildLoad(
    guildId,
    (id) => Promise.all([getGuildConfig(id), getChannels(id)]),
    ([cfg, ch]) => {
      setConfig(cfg);
      setChannels(ch);
    },
  );

  useEffect(() => {
    fetchActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  async function fetchActions() {
    setActionsLoading(true);
    try {
      setActions(await getModActions(guildId, 25));
    } catch {
      // audyt jest opcjonalny — błąd nie blokuje strony
    } finally {
      setActionsLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateGuildConfig(guildId, { modLogChannelId: config.modLogChannelId });
      toast("Zapisano zmiany.", "success");
    } catch {
      toast("Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSearch() {
    const id = searchId.trim();
    if (!id) return;
    setWarnsLoading(true);
    setSearchedId(id);
    try {
      setWarns(await getWarnings(guildId, id));
    } catch {
      toast("Nie udało się pobrać ostrzeżeń.", "error");
    } finally {
      setWarnsLoading(false);
    }
  }

  async function handleClearWarns() {
    if (!searchedId) return;
    setPendingClear(false);
    try {
      await clearWarnings(guildId, searchedId);
      setWarns([]);
      toast("Ostrzeżenia usunięte.", "success");
      fetchActions();
    } catch {
      toast("Nie udało się wyczyścić ostrzeżeń.", "error");
    }
  }

  if (loading) return <ModSkeleton />;

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Server Safety"
        title={
          <>
            System <span className="italic text-[#d4a843]">moderacji</span>
          </>
        }
        description="Kanał logów oraz zarządzanie ostrzeżeniami użytkowników."
        className="mb-0"
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Config */}
        <div className="flex flex-col gap-4 lg:w-80">
          <div className="rounded-xl border border-white/5 bg-[#1a1f2e]">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <p className="text-sm font-semibold text-white">Konfiguracja</p>
              <SaveButton
                onClick={handleSave}
                saving={saving}
                className="px-4 py-1.5 text-xs"
              />
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Kanał logów moderacji
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <ChannelSelect
                    value={config.modLogChannelId ?? ""}
                    onChange={(v) => setConfig((c) => ({ ...c, modLogChannelId: v }))}
                    channels={channels}
                    placeholder="— Wybierz kanał —"
                    className="min-w-0 flex-1 px-3 py-2.5"
                  />
                  <CreateChannelButton
                    guildId={guildId}
                    defaultName="mod-logi"
                    onCreated={(ch) => {
                      setChannels((prev) =>
                        [...prev, ch].sort((a, b) => a.name.localeCompare(b.name)),
                      );
                      setConfig((c) => ({ ...c, modLogChannelId: ch.id }));
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  Tutaj trafiają logi: warn, mute, kick, ban. Audyt zapisuje się też do
                  bazy.
                </p>
              </div>
            </div>
          </div>

          <HowItWorks
            steps={[
              "Ustaw kanał logów — tam bot zapisuje każdą akcję moderacyjną",
              "Komendy /mod_warn /mod_mute /mod_kick /mod_ban dostępne dla adminów",
              "Historia ostrzeżeń przechowywana w bazie danych",
              "Możesz przeglądać i czyścić warny z tego panelu",
            ]}
          />
        </div>

        {/* Warnings */}
        <div className="flex-1">
          <div className="rounded-xl border border-white/5 bg-[#1a1f2e]">
            <div className="border-b border-white/5 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Wyszukaj po Discord User ID
              </p>
              <p className="text-sm font-semibold text-white">Ostrzeżenia</p>
            </div>

            <div className="p-6">
              <div className="flex gap-2">
                <input
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="np. 123456789012345678"
                  className="flex-1 rounded-lg bg-[#0f1117] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchId.trim() || warnsLoading}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#d4a843] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#c49b3a] disabled:opacity-40"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {warnsLoading ? "Szukam…" : "Szukaj"}
                  </span>
                </button>
              </div>

              {searchedId && !warnsLoading && (
                <div className="mt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      User <span className="font-mono text-gray-400">{searchedId}</span> ·{" "}
                      <span className="text-white">{warns.length}</span> ostrzeżeń
                    </p>
                    {warns.length > 0 && (
                      <button
                        onClick={() => setPendingClear(true)}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Wyczyść wszystkie
                      </button>
                    )}
                  </div>

                  {warns.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">
                      Brak ostrzeżeń dla tego użytkownika.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {warns.map((w, i) => (
                        <div
                          key={w.id}
                          className="flex items-start gap-3 rounded-lg bg-[#0f1117] px-4 py-3"
                        >
                          <span
                            className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-bold ${ACTION_COLORS.warn}`}
                          >
                            #{i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{w.reason}</p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              Przez <span className="font-mono">{w.moderatorId}</span> ·{" "}
                              {new Date(w.createdAt).toLocaleString("pl-PL")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!searchedId && (
                <p className="mt-4 text-center text-sm text-gray-600">
                  Wpisz Discord User ID i kliknij Szukaj.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audit log — trwała historia wszystkich akcji moderacyjnych */}
      <div className="rounded-xl border border-white/5 bg-[#1a1f2e]">
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Trwały zapis w bazie · ostatnie 25
            </p>
            <p className="text-base font-semibold text-white">📋 Dziennik akcji</p>
          </div>
          <button
            onClick={() => fetchActions()}
            disabled={actionsLoading}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0f1117] px-3 py-1.5 text-xs text-gray-400 transition hover:text-white disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${actionsLoading ? "animate-spin" : ""}`} />
            {actionsLoading ? "Ładowanie…" : "Odśwież"}
          </button>
        </div>

        {actionsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b border-white/5 last:border-0">
              <SkeletonRow />
            </div>
          ))
        ) : actions.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            Brak akcji moderacyjnych.
          </div>
        ) : (
          actions.map((a) => {
            const meta = ACTION_META[a.type];
            return (
              <div
                key={a.id}
                className="flex flex-col gap-2 border-b border-white/5 px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-3 sm:px-6"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={`w-16 shrink-0 rounded px-2 py-0.5 text-center text-xs font-bold ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{a.reason}</p>
                    <p className="truncate text-xs text-gray-500">
                      <span className="font-mono">{a.userId}</span>
                      {a.extra ? (
                        <span className="text-gray-600"> · {a.extra}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 pl-[4.75rem] text-xs text-gray-600 sm:pl-0 sm:text-right">
                  <p className="truncate font-mono">{a.moderatorId}</p>
                  <p>{new Date(a.createdAt).toLocaleString("pl-PL")}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {pendingClear && (
        <ConfirmModal
          message={`Czy na pewno chcesz usunąć wszystkie ostrzeżenia dla użytkownika ${searchedId}?`}
          onConfirm={handleClearWarns}
          onCancel={() => setPendingClear(false)}
        />
      )}
    </div>
  );
}
