"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { AutoModConfig, Channel, GuildConfig, Role } from "@/lib/api";
import { getChannels, getGuildConfig, getRoles, updateGuildConfig } from "@/lib/api";

const DEFAULT_AUTOMOD: AutoModConfig = {
  enabled: false,
  blockInvites: false,
  blockLinks: false,
  bannedWords: [],
  spamEnabled: false,
  spamMaxMessages: 5,
  spamWindowSeconds: 5,
  exemptRoleIds: [],
  exemptChannelIds: [],
  action: "delete",
  muteDurationSeconds: 300,
};

const ACTIONS: { value: AutoModConfig["action"]; label: string }[] = [
  { value: "delete", label: "Usuń wiadomość" },
  { value: "warn", label: "Usuń + ostrzeż" },
  { value: "mute", label: "Usuń + timeout" },
];

function Toggle({
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
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-white">{label}</p>
        {desc && <p className="text-xs text-gray-500">{desc}</p>}
      </div>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-gray-700 transition after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#d4a843] peer-checked:after:translate-x-full" />
      </span>
    </label>
  );
}

function AutoModSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div>
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

const CARD = "rounded-xl border border-white/5 bg-[#1a1f2e]";
const SECTION_HEAD = "border-b border-white/5 px-6 py-4 text-sm font-semibold text-white";
const NUM_INPUT =
  "w-20 rounded-lg bg-[#0f1117] px-2 py-1.5 text-center text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]";

export default function AutoModPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [config, setConfig] = useState<GuildConfig>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [saving, setSaving] = useState(false);

  const { loading } = useGuildLoad(
    guildId,
    (id) => Promise.all([getGuildConfig(id), getRoles(id), getChannels(id)]),
    ([cfg, r, ch]) => {
      setConfig(cfg);
      setRoles(r);
      setChannels(ch);
    },
  );

  const am = config.autoMod ?? DEFAULT_AUTOMOD;
  const setAm = (patch: Partial<AutoModConfig>) =>
    setConfig((c) => ({ ...c, autoMod: { ...(c.autoMod ?? DEFAULT_AUTOMOD), ...patch } }));

  async function handleSave() {
    setSaving(true);
    try {
      await updateGuildConfig(guildId, { autoMod: config.autoMod ?? DEFAULT_AUTOMOD });
      toast("Zapisano zmiany.", "success");
    } catch {
      toast("Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  if (loading) return <AutoModSkeleton />;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          category="Ochrona automatyczna"
          title={
            <>
              Auto-<span className="italic text-[#d4a843]">moderacja</span>
            </>
          }
          description="Automatyczne wykrywanie i usuwanie niepożądanych wiadomości."
          className="mb-0"
        />
        <SaveButton onClick={handleSave} saving={saving} className="px-5 py-2" />
      </div>

      {/* Master switch */}
      <div className={`${CARD} p-6`}>
        <Toggle
          checked={am.enabled}
          onChange={(v) => setAm({ enabled: v })}
          label="Włącz auto-moderację"
          desc="Gdy wyłączona, żadne filtry nie działają. Administratorzy i moderatorzy (Zarządzanie wiadomościami) są zawsze pomijani."
        />
      </div>

      <div className={am.enabled ? "" : "pointer-events-none opacity-50"}>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-6">
            {/* Filtry */}
            <div className={CARD}>
              <p className={SECTION_HEAD}>Filtry</p>
              <div className="flex flex-col gap-5 p-6">
                <Toggle
                  checked={am.blockInvites}
                  onChange={(v) => setAm({ blockInvites: v })}
                  label="Blokuj zaproszenia Discord"
                  desc="Wiadomości z linkami discord.gg / invite."
                />
                <Toggle
                  checked={am.blockLinks}
                  onChange={(v) => setAm({ blockLinks: v })}
                  label="Blokuj linki"
                  desc="Dowolne adresy http(s)."
                />

                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Niedozwolone słowa (jedno na linię)
                  </label>
                  <textarea
                    value={am.bannedWords.join("\n")}
                    onChange={(e) =>
                      setAm({
                        bannedWords: e.target.value
                          .split(/[\n,]/)
                          .map((w) => w.trim())
                          .filter(Boolean),
                      })
                    }
                    rows={4}
                    placeholder="np. spamword"
                    className="w-full resize-y rounded-lg bg-[#0f1117] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                  />
                </div>

                <div className="border-t border-white/5 pt-4">
                  <Toggle
                    checked={am.spamEnabled}
                    onChange={(v) => setAm({ spamEnabled: v })}
                    label="Anty-spam"
                    desc="Reaguj, gdy użytkownik wysyła zbyt wiele wiadomości w krótkim czasie."
                  />
                  {am.spamEnabled && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-400">
                      <span>Maks.</span>
                      <input
                        type="number"
                        min={2}
                        max={50}
                        value={am.spamMaxMessages}
                        onChange={(e) =>
                          setAm({ spamMaxMessages: Number(e.target.value) })
                        }
                        className={NUM_INPUT}
                      />
                      <span>wiadomości w</span>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={am.spamWindowSeconds}
                        onChange={(e) =>
                          setAm({ spamWindowSeconds: Number(e.target.value) })
                        }
                        className={NUM_INPUT}
                      />
                      <span>sekund.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Akcja */}
            <div className={CARD}>
              <p className={SECTION_HEAD}>Akcja przy wykryciu</p>
              <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setAm({ action: a.value })}
                      className={`rounded-lg px-4 py-2 text-sm transition ${
                        am.action === a.value
                          ? "bg-[#d4a843] font-semibold text-black"
                          : "bg-[#0f1117] text-gray-400 hover:text-white"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                {am.action === "mute" && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                    <span>Czas timeoutu:</span>
                    <input
                      type="number"
                      min={10}
                      max={2419200}
                      value={am.muteDurationSeconds}
                      onChange={(e) =>
                        setAm({ muteDurationSeconds: Number(e.target.value) })
                      }
                      className={NUM_INPUT}
                    />
                    <span>sekund.</span>
                  </div>
                )}
                <p className="text-xs text-gray-600">
                  Każda akcja usuwa wiadomość. „Ostrzeż" zapisuje warn, „Timeout" wycisza
                  użytkownika. Obie trafiają do logów moderacji.
                </p>
              </div>
            </div>
          </div>

          {/* Wyjątki */}
          <div className="flex w-full flex-col gap-6 lg:w-80">
            <div className={CARD}>
              <p className={SECTION_HEAD}>Wyjątki</p>
              <div className="flex flex-col gap-4 p-6">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Pomijane role</label>
                  <RoleSelect
                    value=""
                    onChange={(v) =>
                      v &&
                      !am.exemptRoleIds.includes(v) &&
                      setAm({ exemptRoleIds: [...am.exemptRoleIds, v] })
                    }
                    roles={roles.filter((r) => !am.exemptRoleIds.includes(r.id))}
                    placeholder="+ Dodaj rolę"
                    className="w-full px-3 py-2"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {am.exemptRoleIds.map((id) => (
                      <button
                        key={id}
                        onClick={() =>
                          setAm({ exemptRoleIds: am.exemptRoleIds.filter((x) => x !== id) })
                        }
                        className="rounded-full bg-[#0f1117] px-2.5 py-1 text-xs text-gray-300 hover:text-red-400"
                      >
                        @{roleName(id)} ✕
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">Pomijane kanały</label>
                  <ChannelSelect
                    value=""
                    onChange={(v) =>
                      v &&
                      !am.exemptChannelIds.includes(v) &&
                      setAm({ exemptChannelIds: [...am.exemptChannelIds, v] })
                    }
                    channels={channels.filter((c) => !am.exemptChannelIds.includes(c.id))}
                    placeholder="+ Dodaj kanał"
                    className="w-full px-3 py-2"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {am.exemptChannelIds.map((id) => (
                      <button
                        key={id}
                        onClick={() =>
                          setAm({
                            exemptChannelIds: am.exemptChannelIds.filter((x) => x !== id),
                          })
                        }
                        className="rounded-full bg-[#0f1117] px-2.5 py-1 text-xs text-gray-300 hover:text-red-400"
                      >
                        #{channelName(id)} ✕
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <HowItWorks
              steps={[
                "Włącz auto-moderację i wybierz filtry",
                "Ustaw akcję: usunięcie, ostrzeżenie lub timeout",
                "Dodaj wyjątki dla zaufanych ról i kanałów",
                "Bot wymaga uprawnień Zarządzanie wiadomościami (i Timeout dla mute)",
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
