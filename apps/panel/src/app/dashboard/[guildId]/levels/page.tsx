"use client";

import { TrendingUp } from "lucide-react";
import { useParams } from "next/navigation";
import { useId, useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { ConfirmModal } from "@/components/confirmModal";
import { CreateRoleButton } from "@/components/CreateRoleButton";
import { EmbedEditor } from "@/components/EmbedEditor";
import { EmbedPreviewCard } from "@/components/EmbedPreviewCard";
import { LeaderboardRows } from "@/components/Leaderboard";
import { LevelsGuide } from "@/components/LevelsGuide";
import { PageHeader } from "@/components/PageHeader";
import { PanelCard } from "@/components/PanelCard";
import { RefreshButton } from "@/components/RefreshButton";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { VariablesCard } from "@/components/VariablesCard";
import {
  useBotStatus,
  useChannels,
  useGuildConfig,
  useLeaderboard,
  useRoles,
} from "@/hooks/queries";
import { useRedirectOnError, useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { Channel, EmbedConfig, GuildConfig, LevelingConfig, Role } from "@/lib/api";
import { updateGuildConfig } from "@/lib/api";
import { LEVEL_VARS, previewReplacer, VARIABLE_INFO } from "@/lib/embed";

const DEFAULT_LEVELING: LevelingConfig = {
  messageXp: 5,
  voiceXp: 0,
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

/** Suwak XP 0–8 z aktualną wartością w odznace. */
function XpSlider({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const sliderId = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-xs text-gray-400" htmlFor={sliderId}>
          {label}
        </label>
        <span className="shrink-0 rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
          {value} XP
        </span>
      </div>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={8}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="block w-full cursor-pointer accent-primary"
      />
      {/* Podziałka 0–8 — przedziały po 1 XP, klikalne. */}
      <div className="mt-1 flex justify-between px-0.5">
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`w-3 text-center text-[10px] tabular-nums transition ${
              i === value ? "font-bold text-primary" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      {desc && <p className="mt-1 text-xs text-gray-500">{desc}</p>}
    </div>
  );
}

/** Szkielet tylko kart z danymi — nagłówek i „Jak to działa" renderują się od razu. */
function LevelsSkeleton() {
  return (
    <>
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
    </>
  );
}

export default function LevelsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [config, setConfig] = useState<GuildConfig>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [saving, setSaving] = useState(false);
  const [newLevel, setNewLevel] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const configQ = useGuildConfig(guildId);
  const rolesQ = useRoles(guildId);
  const channelsQ = useChannels(guildId);
  // Tożsamość bota (avatar + nazwa) do podglądu „jak wystawi to bot serwera".
  const botStatusQ = useBotStatus();
  const lbQ = useLeaderboard(guildId, 10);
  const leaderboard = lbQ.data ?? [];
  const leaderboardLoading = lbQ.isLoading;
  // Bramka tylko na config; role/kanały (proxy do Discorda) i leaderboard dopełnią się w tle.
  const loading = configQ.isLoading;
  useRedirectOnError(configQ.isError, configQ.error);
  const configReady = useSeedOnce(configQ.data, setConfig);
  useSeedOnce(rolesQ.data, setRoles);
  useSeedOnce(channelsQ.data, setChannels);

  // Scalenie z defaultami wypełnia pola brakujące w starszych zapisach.
  const lv = { ...DEFAULT_LEVELING, ...config.leveling };
  const setLv = (patch: Partial<LevelingConfig>) =>
    setConfig((c) => ({
      ...c,
      leveling: { ...DEFAULT_LEVELING, ...c.leveling, ...patch },
    }));
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

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
    configReady,
  );

  const rewards = (config.roleRewards ?? []).slice().sort((a, b) => a.level - b.level);

  return (
    <div className="jh-in flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Growth Ladder"
        icon={TrendingUp}
        title={
          <>
            System <span className="italic text-primary">levelowania</span>
          </>
        }
        description="Mapowanie progów XP na istniejące role Discord."
        className="mb-0"
      />

      <LevelsGuide />

      {loading ? (
        <LevelsSkeleton />
      ) : (
        <>
          <div className="flex flex-col gap-6 lg:flex-row">
            <PanelCard
              title="Tiery → Role"
              description="Mapowanie progu XP na istniejącą rolę Discord"
              action={
                <SaveButton
                  onClick={handleSave}
                  saving={saving}
                  autoSaveStatus={autoSaveStatus}
                  className="px-4 py-2"
                />
              }
              bodyClassName=""
              className="flex-1"
            >
              <div className="grid grid-cols-3 border-b border-border px-6 py-2">
                {["Lv.", "Tier", "Rola Discord"].map((h) => (
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
            </PanelCard>

            <PanelCard
              title="Dodaj próg"
              bodyClassName="flex flex-col gap-3 p-6"
              className="w-full shrink-0 lg:w-72"
            >
              <div>
                <label className="mb-1 block text-xs text-gray-400" htmlFor="newLevel">
                  Level
                </label>
                <input
                  id="newLevel"
                  name="newLevel"
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
            </PanelCard>
          </div>

          {/* Ustawienia XP */}
          <PanelCard
            title="Ustawienia XP"
            description="Ile i gdzie naliczać punkty doświadczenia"
            action={
              <SaveButton
                onClick={handleSave}
                saving={saving}
                autoSaveStatus={autoSaveStatus}
                className="px-4 py-2"
              />
            }
            bodyClassName="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2"
          >
            <div className="flex flex-col gap-5">
              <XpSlider
                label="XP za wiadomość"
                desc="Ile XP członek dostaje za wiadomość (z cooldownem antyspamowym). 0 = wyłączone."
                value={lv.messageXp ?? 0}
                onChange={(v) => setLv({ messageXp: v })}
              />
              <XpSlider
                label="XP za minutę na kanale głosowym"
                desc="Naliczane co minutę po przekroczeniu 1 min na głosówce (poza AFK / wyciszonymi). 0 = wyłączone."
                value={lv.voiceXp ?? 0}
                onChange={(v) => setLv({ voiceXp: v })}
              />
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
                        setLv({
                          noXpChannelIds: lv.noXpChannelIds.filter((x) => x !== id),
                        })
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
          </PanelCard>

          {/* Wiadomość o awansie — edytor i podgląd po 50% w jednej linii (jak panel ticketów) */}
          <div
            className={
              config.levelUpEmbed
                ? "grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
                : ""
            }
          >
            <PanelCard
              title="Wiadomość o awansie"
              description="Embed wysyłany przy zdobyciu nowego poziomu."
              action={
                <SaveButton
                  onClick={handleSave}
                  saving={saving}
                  autoSaveStatus={autoSaveStatus}
                  className="px-4 py-2"
                />
              }
            >
              <div className="max-w-xs">
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
              {config.levelUpEmbed ? (
                <EmbedEditor
                  value={config.levelUpEmbed}
                  onChange={(embed) => setConfig((c) => ({ ...c, levelUpEmbed: embed }))}
                  variables={LEVEL_VARS}
                />
              ) : (
                <p className="text-sm text-gray-400">
                  Używany jest wbudowany domyślny embed awansu. Włącz „Własny embed”, aby
                  dostosować treść i wygląd.
                </p>
              )}
            </PanelCard>

            {config.levelUpEmbed && (
              <div className="flex flex-col gap-6 lg:sticky lg:top-20">
                <EmbedPreviewCard
                  title="Podgląd na żywo"
                  description="Tak zobaczą to członkowie"
                  embed={config.levelUpEmbed}
                  replace={previewReplacer}
                  author={{
                    name: botStatusQ.data?.username ?? "Jurassic Haven",
                    avatar: botStatusQ.data?.avatar ?? null,
                  }}
                />
                <VariablesCard
                  items={LEVEL_VARS.map((v) => ({
                    label: v,
                    desc: VARIABLE_INFO[v] ?? "",
                  }))}
                />
              </div>
            )}
          </div>

          {/* Leaderboard — ten sam komponent rankingu co na przeglądzie */}
          <PanelCard
            title="Leaderboard"
            description="Najaktywniejsi członkowie serwera"
            action={
              <RefreshButton onClick={() => lbQ.refetch()} loading={lbQ.isFetching} />
            }
            bodyClassName=""
          >
            <LeaderboardRows
              entries={leaderboard}
              loading={leaderboardLoading}
              rows={10}
            />
          </PanelCard>
        </>
      )}

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
