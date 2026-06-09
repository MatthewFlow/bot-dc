"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { ChannelSelect } from "@/components/ChannelSelect";
import { ConfirmModal } from "@/components/confirmModal";
import { CreateRoleButton } from "@/components/CreateRoleButton";
import { EmbedEditor } from "@/components/EmbedEditor";
import { EmbedPreview } from "@/components/EmbedPreview";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type {
  Channel,
  EmbedConfig,
  GuildConfig,
  LeaderboardEntry,
  LevelingConfig,
  Role,
} from "@/lib/api";
import {
  getChannels,
  getGuildConfig,
  getLeaderboard,
  getRoles,
  updateGuildConfig,
} from "@/lib/api";
import { LEVEL_VARS, previewReplacer } from "@/lib/embed";

const MEDALS = ["🥇", "🥈", "🥉"];

const DEFAULT_LEVELING: LevelingConfig = {
  xpMultiplier: 1,
  noXpChannelIds: [],
  noXpRoleIds: [],
  levelUpEnabled: true,
  levelUpDm: false,
};

const DEFAULT_LEVELUP_EMBED: EmbedConfig = {
  title: "📈 Nowy level!",
  description: "{user} wbił **level {level}** 🎉",
  color: 0xd4a843,
  thumbnailUrl: "{avatar}",
  timestamp: true,
};

function LvToggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-white">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}

function LevelsSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div>
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 surface-raised rounded-xl bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="grid grid-cols-3 items-center border-b border-border px-6 py-3"
            >
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl lg:w-72" />
      </div>
      <div className="surface-raised rounded-xl bg-card">
        <div className="border-b border-border px-6 py-4">
          <Skeleton className="h-4 w-32" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-border last:border-0">
            <SkeletonRow />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LevelsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [config, setConfig] = useState<GuildConfig>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLevel, setNewLevel] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const { loading } = useGuildLoad(
    guildId,
    (id) => Promise.all([getGuildConfig(id), getRoles(id), getChannels(id)]),
    ([cfg, r, ch]) => {
      setConfig(cfg);
      setRoles(r);
      setChannels(ch);
    },
  );

  // Scalenie z defaultami wypełnia pola brakujące w starszych zapisach.
  const lv = { ...DEFAULT_LEVELING, ...config.leveling };
  const setLv = (patch: Partial<LevelingConfig>) =>
    setConfig((c) => ({
      ...c,
      leveling: { ...DEFAULT_LEVELING, ...c.leveling, ...patch },
    }));
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  async function fetchLeaderboard(force = false) {
    setLeaderboardLoading(true);
    try {
      setLeaderboard(await getLeaderboard(guildId, 10, force));
    } catch {
      // leaderboard jest opcjonalny — błąd fetch nie blokuje reszty strony
    } finally {
      setLeaderboardLoading(false);
    }
  }

  function roleName(roleId: string) {
    return roles.find((r) => r.id === roleId)?.name ?? roleId;
  }

  function addReward() {
    const level = parseInt(newLevel);
    if (!level || level < 1 || !newRoleId) return;
    const rewards = config.roleRewards ?? [];
    const filtered = rewards.filter((r) => r.level !== level);
    filtered.push({ level, roleId: newRoleId });
    filtered.sort((a, b) => a.level - b.level);
    setConfig((c) => ({ ...c, roleRewards: filtered }));
    setNewLevel("");
    setNewRoleId("");
  }

  function removeReward(level: number) {
    setConfig((c) => ({
      ...c,
      roleRewards: (c.roleRewards ?? []).filter((r) => r.level !== level),
    }));
    setPendingDelete(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateGuildConfig(guildId, {
        roleRewards: config.roleRewards,
        leveling: config.leveling ?? DEFAULT_LEVELING,
        levelUpEmbed: config.levelUpEmbed ?? null,
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
      roleRewards: config.roleRewards,
      leveling: config.leveling,
      levelUpEmbed: config.levelUpEmbed,
    }),
    handleSave,
    !loading,
  );

  if (loading) return <LevelsSkeleton />;

  const rewards = (config.roleRewards ?? []).slice().sort((a, b) => a.level - b.level);

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Growth Ladder"
        title={
          <>
            System <span className="italic text-primary">levelowania</span>
          </>
        }
        description="Mapowanie progów XP na istniejące role Discord."
        className="mb-0"
      />

      <HowItWorks
        steps={[
          "Za pisanie na czacie członkowie zdobywają XP (z cooldownem antyspamowym).",
          "Po przekroczeniu progu levela bot automatycznie nadaje przypisaną rolę.",
          "Wyższy level = wyższy tier z listy; opcjonalnie powiadomienie o awansie.",
          "Leaderboard pokazuje ranking najaktywniejszych członków serwera.",
        ]}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 surface-raised rounded-xl bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Mapowanie progu XP na istniejącą rolę Discord
              </p>
              <p className="text-base font-semibold text-white">Tiery → Role</p>
            </div>
            <SaveButton
              onClick={handleSave}
              saving={saving}
              autoSaveStatus={autoSaveStatus}
              className="px-4 py-2"
            />
          </div>

          <div className="grid grid-cols-3 border-b border-border px-6 py-2">
            {["Lv.", "Tier", "Discord rola"].map((h) => (
              <span
                key={h}
                className="text-xs font-semibold uppercase tracking-wider text-gray-400"
              >
                {h}
              </span>
            ))}
          </div>

          {rewards.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              Brak progów. Dodaj pierwszy po prawej.
            </div>
          ) : (
            rewards.map((r) => (
              <div
                key={r.level}
                className="grid grid-cols-3 items-center border-b border-border px-6 py-3 last:border-0"
              >
                <span className="text-sm font-bold text-white">Lv. {r.level}</span>
                <span className="inline-flex">
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                    {roleName(r.roleId).toUpperCase()}
                  </span>
                </span>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-gray-300">
                    <span className="h-2 w-2 rounded-full bg-discord" />
                    {roleName(r.roleId)}
                  </span>
                  <button
                    onClick={() => setPendingDelete(r.level)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-72">
          <div className="surface-raised rounded-xl bg-card p-6">
            <p className="mb-4 text-sm font-semibold text-white">Dodaj próg</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Level</label>
                <input
                  type="number"
                  min={1}
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  placeholder="np. 10"
                  className="w-full rounded-lg bg-background px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Rola Discord</label>
                <RoleSelect
                  value={newRoleId}
                  onChange={setNewRoleId}
                  roles={roles}
                  className="w-full px-3 py-2"
                />
                <div className="mt-2">
                  <CreateRoleButton
                    guildId={guildId}
                    onCreated={(role) => {
                      setRoles((prev) =>
                        [...prev, role].sort((a, b) => b.position - a.position),
                      );
                      setNewRoleId(role.id);
                    }}
                  />
                </div>
              </div>
              <Button
                onClick={addReward}
                disabled={!newLevel || !newRoleId}
                className="mt-1"
              >
                + Dodaj tier
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Ustawienia XP */}
      <div className="surface-raised rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <p className="text-sm font-semibold text-white">Ustawienia XP</p>
          <SaveButton
            onClick={handleSave}
            saving={saving}
            className="px-4 py-1.5 text-xs"
          />
        </div>
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Mnożnik XP</label>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={lv.xpMultiplier}
                  onChange={(e) => setLv({ xpMultiplier: Number(e.target.value) })}
                  className="w-24 rounded-lg bg-background px-3 py-2 text-center text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                />
                <span>× (np. 2 = podwójne XP)</span>
              </div>
            </div>
            <div className="flex flex-col gap-4 border-t border-border pt-4">
              <LvToggle
                checked={lv.levelUpEnabled}
                onChange={(v) => setLv({ levelUpEnabled: v })}
                label="Powiadomienia o awansie na kanale"
                desc="Wysyłaj wiadomość o nowym levelu na kanał level-up."
              />
              <LvToggle
                checked={lv.levelUpDm}
                onChange={(v) => setLv({ levelUpDm: v })}
                label="Powiadomienia w DM"
                desc="Dodatkowo wyślij informację o awansie w prywatnej wiadomości."
              />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Kanały bez XP</label>
              <ChannelSelect
                value=""
                onChange={(v) =>
                  v &&
                  !lv.noXpChannelIds.includes(v) &&
                  setLv({ noXpChannelIds: [...lv.noXpChannelIds, v] })
                }
                channels={channels.filter((c) => !lv.noXpChannelIds.includes(c.id))}
                placeholder="+ Dodaj kanał"
                className="w-full px-3 py-2"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {lv.noXpChannelIds.map((id) => (
                  <button
                    key={id}
                    onClick={() =>
                      setLv({ noXpChannelIds: lv.noXpChannelIds.filter((x) => x !== id) })
                    }
                    className="rounded-full bg-background px-2.5 py-1 text-xs text-gray-300 hover:text-red-400"
                  >
                    #{channelName(id)} ✕
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Role bez XP</label>
              <RoleSelect
                value=""
                onChange={(v) =>
                  v &&
                  !lv.noXpRoleIds.includes(v) &&
                  setLv({ noXpRoleIds: [...lv.noXpRoleIds, v] })
                }
                roles={roles.filter((r) => !lv.noXpRoleIds.includes(r.id))}
                placeholder="+ Dodaj rolę"
                className="w-full px-3 py-2"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {lv.noXpRoleIds.map((id) => (
                  <button
                    key={id}
                    onClick={() =>
                      setLv({ noXpRoleIds: lv.noXpRoleIds.filter((x) => x !== id) })
                    }
                    className="rounded-full bg-background px-2.5 py-1 text-xs text-gray-300 hover:text-red-400"
                  >
                    @{roleName(id)} ✕
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wiadomość o awansie (embed) */}
      <div className="surface-raised rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Wiadomość o awansie</p>
            <p className="text-xs text-gray-400">
              Embed wysyłany przy zdobyciu nowego poziomu.
            </p>
          </div>
          <SaveButton
            onClick={handleSave}
            saving={saving}
            className="px-4 py-1.5 text-xs"
          />
        </div>
        <div className="p-6">
          <div className="mb-4 max-w-xs">
            <LvToggle
              checked={Boolean(config.levelUpEmbed)}
              onChange={(v) =>
                setConfig((c) => ({
                  ...c,
                  levelUpEmbed: v ? DEFAULT_LEVELUP_EMBED : undefined,
                }))
              }
              label="Własny embed"
              desc="Wyłączone = wbudowany domyślny embed."
            />
          </div>
          {config.levelUpEmbed && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <EmbedEditor
                value={config.levelUpEmbed}
                onChange={(embed) => setConfig((c) => ({ ...c, levelUpEmbed: embed }))}
                variables={LEVEL_VARS}
              />
              <div className="lg:sticky lg:top-20 lg:self-start">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Podgląd
                </p>
                <EmbedPreview embed={config.levelUpEmbed} replace={previewReplacer} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="surface-raised rounded-xl bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Wszyscy aktywni członkowie
            </p>
            <p className="text-base font-semibold text-white">🏆 Leaderboard</p>
          </div>
          <button
            onClick={() => fetchLeaderboard(true)}
            disabled={leaderboardLoading}
            className="rounded-lg bg-background px-3 py-1.5 text-xs text-gray-300 transition hover:text-white disabled:opacity-50"
          >
            {leaderboardLoading ? "Ładowanie..." : "↻ Odśwież"}
          </button>
        </div>

        <div className="grid grid-cols-[2rem_1fr_6rem_6rem] gap-4 border-b border-border px-6 py-2">
          {["#", "Gracz", "Level", "XP"].map((h, i) => (
            <span
              key={h}
              className={`text-xs font-semibold uppercase tracking-wider text-gray-400 ${i >= 2 ? "text-right" : ""}`}
            >
              {h}
            </span>
          ))}
        </div>

        {leaderboardLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-border last:border-0">
              <SkeletonRow />
            </div>
          ))
        ) : leaderboard.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            Brak danych XP na tym serwerze.
          </div>
        ) : (
          leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className={`grid grid-cols-[2rem_1fr_6rem_6rem] items-center gap-4 border-b border-border px-6 py-3 last:border-0 ${entry.position <= 3 ? "bg-primary/5" : ""}`}
            >
              <span className="text-sm font-bold text-gray-300">
                {MEDALS[entry.position - 1] ?? entry.position}
              </span>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={entry.avatar} name={entry.displayName} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {entry.displayName}
                  </p>
                  {entry.username && (
                    <p className="truncate text-xs text-gray-400">@{entry.username}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                  Lv. {entry.level}
                </span>
              </div>
              <div className="text-right text-sm text-gray-300">
                {entry.xp.toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {pendingDelete !== null && (
        <ConfirmModal
          message={`Czy na pewno chcesz usunąć próg dla poziomu ${pendingDelete}?`}
          onConfirm={() => removeReward(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
