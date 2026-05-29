"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getGuildConfig, getRoles, updateGuildConfig } from "@/lib/api";
import type { GuildConfig, Role } from "@/lib/api";

export default function AutoRolePage() {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;

  const [config, setConfig] = useState<GuildConfig>({});
  const [savedRoleId, setSavedRoleId] = useState<string | undefined>(undefined);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("jh_token");
    if (!token) {
      router.replace("/");
      return;
    }

    Promise.all([getGuildConfig(token, guildId), getRoles(token, guildId)])
      .then(([cfg, r]) => {
        setConfig(cfg);
        setSavedRoleId(cfg.joinRoleId);
        setRoles(r);
      })
      .catch(() => router.replace("/dashboard"))
      .finally(() => setLoading(false));
  }, [guildId, router]);

  async function handleSave() {
    const token = localStorage.getItem("jh_token");
    if (!token) return;

    setSaving(true);
    try {
      await updateGuildConfig(token, guildId, { joinRoleId: config.joinRoleId });
      setSavedRoleId(config.joinRoleId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = config.joinRoleId !== savedRoleId;
  const activeRole = roles.find((r) => r.id === savedRoleId);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          Assignment Grid
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Auto-role <span className="italic text-[#d4a843]">& reakcje</span>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Automatyczne nadawanie roli przy wejściu na serwer.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 rounded-xl bg-[#1a1f2e]">
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Nadawane automatycznie nowym członkom
              </p>
              <p className="text-base font-semibold text-white">
                Auto-role przy dołączeniu
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!!config.joinRoleId}
                onChange={(e) => {
                  if (!e.target.checked) {
                    setConfig((c) => ({ ...c, joinRoleId: undefined }));
                  }
                }}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#d4a843] peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div className="p-6">
            <p className="mb-3 text-sm text-gray-400">
              Wybierz rolę która będzie nadawana każdemu nowemu członkowi przy dołączeniu.
              Zazwyczaj jest to rola <span className="text-white">@Niezweryfikowany</span> lub podobna.
            </p>

            <select
              value={config.joinRoleId ?? ""}
              onChange={(e) =>
                setConfig((c) => ({ ...c, joinRoleId: e.target.value || undefined }))
              }
              className="w-full max-w-sm rounded-lg bg-[#0f1117] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
            >
              <option value="">— Nie ustawiono —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Aktywna rola — tylko to co zapisane w bazie */}
            {activeRole && (
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#0f1117] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#5865F2]" />
                <span className="text-sm text-white">@{activeRole.name}</span>
                <span className="ml-auto text-xs text-gray-500">Aktywna rola przy dołączeniu</span>
              </div>
            )}

            {/* Niezapisane zmiany */}
            {hasChanges && (
              <p className="mt-3 text-xs text-[#d4a843]">
                ● Masz niezapisane zmiany
              </p>
            )}
          </div>

          <div className="border-t border-white/5 px-6 py-4">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="rounded-lg bg-[#d4a843] px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-[#c49b3a] disabled:opacity-50"
            >
              {saving ? "Zapisywanie..." : saved ? "Zapisano ✓" : "Zapisz zmiany"}
            </button>
          </div>
        </div>

        <div className="w-full lg:w-72">
          <div className="rounded-xl bg-[#1a1f2e] p-6">
            <p className="mb-3 text-sm font-semibold text-white">Jak to działa?</p>
            <div className="flex flex-col gap-3 text-sm text-gray-400">
              <div className="flex gap-2">
                <span className="mt-0.5 text-[#d4a843]">1.</span>
                <p>Nowy użytkownik dołącza do serwera</p>
              </div>
              <div className="flex gap-2">
                <span className="mt-0.5 text-[#d4a843]">2.</span>
                <p>Bot automatycznie nadaje wybraną rolę</p>
              </div>
              <div className="flex gap-2">
                <span className="mt-0.5 text-[#d4a843]">3.</span>
                <p>Użytkownik ma ograniczony dostęp do kanałów</p>
              </div>
              <div className="flex gap-2">
                <span className="mt-0.5 text-[#d4a843]">4.</span>
                <p>Po weryfikacji rola jest zmieniana na właściwą</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}