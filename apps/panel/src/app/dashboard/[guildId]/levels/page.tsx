"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmModal } from "@/components/confirmModal";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import type { GuildConfig, LeaderboardEntry, Role } from "@/lib/api";
import { getGuildConfig, getLeaderboard, getRoles, updateGuildConfig } from "@/lib/api";

const MEDALS = ["🥇", "🥈", "🥉"];

function LevelsSkeleton() {
  return (
    <div className="flex flex-col p-8 gap-8">
      <div>
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 rounded-xl bg-[#1a1f2e]">
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="grid grid-cols-3 items-center border-b border-white/5 px-6 py-3"
            >
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="w-full lg:w-72 h-48 rounded-xl" />
      </div>
      <div className="rounded-xl bg-[#1a1f2e]">
        <div className="border-b border-white/5 px-6 py-4">
          <Skeleton className="h-4 w-32" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-white/5 last:border-0">
            <SkeletonRow />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LevelsPage() {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [config, setConfig] = useState<GuildConfig>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLevel, setNewLevel] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("jh_token");
    if (!token) {
      router.replace("/");
      return;
    }

    Promise.all([getGuildConfig(token, guildId), getRoles(token, guildId)])
      .then(([cfg, r]) => {
        setConfig(cfg);
        setRoles(r);
      })
      .catch(() => router.replace("/dashboard"))
      .finally(() => setLoading(false));

    fetchLeaderboard(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId, router]);

  async function fetchLeaderboard(token?: string) {
    const t = token ?? localStorage.getItem("jh_token");
    if (!t) return;
    setLeaderboardLoading(true);
    try {
      setLeaderboard(await getLeaderboard(t, guildId, 10));
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
    const token = localStorage.getItem("jh_token");
    if (!token) return;
    setSaving(true);
    try {
      await updateGuildConfig(token, guildId, { roleRewards: config.roleRewards });
      toast("Zapisano zmiany.", "success");
    } catch {
      toast("Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LevelsSkeleton />;

  const rewards = (config.roleRewards ?? []).slice().sort((a, b) => a.level - b.level);

  return (
    <div className="flex flex-col p-8 gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          Growth Ladder
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          System <span className="italic text-[#d4a843]">levelowania</span>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Mapowanie progów XP na istniejące role Discord.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 rounded-xl bg-[#1a1f2e]">
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Mapowanie progu XP na istniejącą rolę Discord
              </p>
              <p className="text-base font-semibold text-white">Tiery → Role</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#d4a843] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#c49b3a] disabled:opacity-50"
              >
                {saving ? "Zapisywanie..." : "Zapisz zmiany"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 border-b border-white/5 px-6 py-2">
            {["Lv.", "Tier", "Discord rola"].map((h) => (
              <span
                key={h}
                className="text-xs font-semibold uppercase tracking-wider text-gray-600"
              >
                {h}
              </span>
            ))}
          </div>

          {rewards.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              Brak progów. Dodaj pierwszy po prawej.
            </div>
          ) : (
            rewards.map((r) => (
              <div
                key={r.level}
                className="grid grid-cols-3 items-center border-b border-white/5 px-6 py-3 last:border-0"
              >
                <span className="text-sm font-bold text-white">Lv. {r.level}</span>
                <span className="inline-flex">
                  <span className="rounded bg-[#d4a843]/20 px-2 py-0.5 text-xs font-semibold text-[#d4a843]">
                    {roleName(r.roleId).toUpperCase()}
                  </span>
                </span>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-gray-300">
                    <span className="h-2 w-2 rounded-full bg-[#5865F2]" />
                    {roleName(r.roleId)}
                  </span>
                  <button
                    onClick={() => setPendingDelete(r.level)}
                    className="text-gray-600 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="w-full lg:w-72">
          <div className="rounded-xl bg-[#1a1f2e] p-6">
            <p className="mb-4 text-sm font-semibold text-white">Dodaj próg</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Level</label>
                <input
                  type="number"
                  min={1}
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  placeholder="np. 10"
                  className="w-full rounded-lg bg-[#0f1117] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Rola Discord</label>
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full rounded-lg bg-[#0f1117] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                >
                  <option value="">— Wybierz rolę —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={addReward}
                disabled={!newLevel || !newRoleId}
                className="mt-1 rounded-lg bg-[#d4a843] py-2 text-sm font-semibold text-black transition hover:bg-[#c49b3a] disabled:opacity-40"
              >
                + Dodaj tier
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-xl bg-[#1a1f2e]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Wszyscy aktywni członkowie
            </p>
            <p className="text-base font-semibold text-white">🏆 Leaderboard</p>
          </div>
          <button
            onClick={() => fetchLeaderboard()}
            disabled={leaderboardLoading}
            className="rounded-lg bg-[#0f1117] px-3 py-1.5 text-xs text-gray-400 transition hover:text-white disabled:opacity-50"
          >
            {leaderboardLoading ? "Ładowanie..." : "↻ Odśwież"}
          </button>
        </div>

        <div className="grid grid-cols-[2rem_1fr_6rem_6rem] gap-4 border-b border-white/5 px-6 py-2">
          {["#", "Gracz", "Level", "XP"].map((h, i) => (
            <span
              key={h}
              className={`text-xs font-semibold uppercase tracking-wider text-gray-600 ${i >= 2 ? "text-right" : ""}`}
            >
              {h}
            </span>
          ))}
        </div>

        {leaderboardLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-white/5 last:border-0">
              <SkeletonRow />
            </div>
          ))
        ) : leaderboard.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            Brak danych XP na tym serwerze.
          </div>
        ) : (
          leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className={`grid grid-cols-[2rem_1fr_6rem_6rem] items-center gap-4 border-b border-white/5 px-6 py-3 last:border-0 ${entry.position <= 3 ? "bg-[#d4a843]/5" : ""}`}
            >
              <span className="text-sm font-bold text-gray-400">
                {MEDALS[entry.position - 1] ?? entry.position}
              </span>
              <div className="flex min-w-0 items-center gap-3">
                {entry.avatar ? (
                  <img
                    src={entry.avatar}
                    alt={entry.username}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a2f3e] text-xs font-bold text-gray-300">
                    {entry.username[0]?.toUpperCase()}
                  </div>
                )}
                <span className="truncate text-sm font-medium text-white">
                  {entry.username}
                </span>
              </div>
              <div className="text-right">
                <span className="rounded bg-[#d4a843]/20 px-2 py-0.5 text-xs font-semibold text-[#d4a843]">
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
