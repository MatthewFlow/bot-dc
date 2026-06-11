"use client";

import { ShieldBan } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { PageSkeleton, Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { Switch } from "@/components/ui/switch";
import { useAutoSave } from "@/hooks/useAutoSave";
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
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-white">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}

function AutoModSkeleton() {
  return (
    <PageSkeleton>
      <Skeleton className="h-96 w-full rounded-xl" />
    </PageSkeleton>
  );
}

const CARD = "surface-raised rounded-xl border border-border bg-card";
const SECTION_HEAD = "border-b border-border px-6 py-4 text-sm font-semibold text-white";
const NUM_INPUT =
  "w-20 rounded-lg bg-background px-2 py-1.5 text-center text-sm text-white outline-none focus:ring-2 focus:ring-primary";

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

  // Scalenie z defaultami wypełnia pola brakujące w starszych zapisach.
  const am = { ...DEFAULT_AUTOMOD, ...config.autoMod };
  const setAm = (patch: Partial<AutoModConfig>) =>
    setConfig((c) => ({ ...c, autoMod: { ...DEFAULT_AUTOMOD, ...c.autoMod, ...patch } }));

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

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify(config.autoMod ?? DEFAULT_AUTOMOD),
    handleSave,
    !loading,
  );

  if (loading) return <AutoModSkeleton />;

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          category="Ochrona automatyczna"
          icon={ShieldBan}
          title={
            <>
              Auto-<span className="italic text-primary">moderacja</span>
            </>
          }
          description="Automatyczne wykrywanie i usuwanie niepożądanych wiadomości."
          className="mb-0"
        />
        <SaveButton
          onClick={handleSave}
          saving={saving}
          autoSaveStatus={autoSaveStatus}
          className="px-5 py-2"
        />
      </div>

      <HowItWorks
        steps={[
          "Włącz auto-moderację i zaznacz filtry: zaproszenia, linki, słowa, spam.",
          "Ustaw akcję przy wykryciu: usunięcie, ostrzeżenie lub timeout.",
          "Dodaj wyjątki dla zaufanych ról i kanałów — staff jest pomijany automatycznie.",
          "Bot potrzebuje uprawnienia Zarządzanie wiadomościami (oraz Moderuj członków dla mute).",
        ]}
      />

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
                  <label
                    className="mb-1 block text-xs text-gray-400"
                    htmlFor="bannedWords"
                  >
                    Niedozwolone słowa (jedno na linię)
                  </label>
                  <textarea
                    id="bannedWords"
                    name="bannedWords"
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
                    className="w-full resize-y rounded-lg bg-background px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="border-t border-border pt-4">
                  <Toggle
                    checked={am.spamEnabled}
                    onChange={(v) => setAm({ spamEnabled: v })}
                    label="Anty-spam"
                    desc="Reaguj, gdy użytkownik wysyła zbyt wiele wiadomości w krótkim czasie."
                  />
                  {am.spamEnabled && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-300">
                      <span>Maks.</span>
                      <input
                        type="number"
                        name="spamMaxMessages"
                        aria-label="Maksymalna liczba wiadomości"
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
                        name="spamWindowSeconds"
                        aria-label="Okno czasowe w sekundach"
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
                          ? "bg-primary font-semibold text-black"
                          : "bg-background text-gray-300 hover:text-white"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                {am.action === "mute" && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                    <span>Czas timeoutu:</span>
                    <input
                      type="number"
                      name="muteDurationSeconds"
                      aria-label="Czas timeoutu w sekundach"
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
                <p className="text-xs text-gray-400">
                  Każda akcja usuwa wiadomość. „Ostrzeż” zapisuje warn, „Timeout” wycisza
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
                  <label className="mb-1 block text-xs text-gray-400">
                    Pomijane role
                  </label>
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
                          setAm({
                            exemptRoleIds: am.exemptRoleIds.filter((x) => x !== id),
                          })
                        }
                        className="rounded-full bg-background px-2.5 py-1 text-xs text-gray-300 hover:text-red-400"
                      >
                        @{roleName(id)} ✕
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">
                    Pomijane kanały
                  </label>
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
                        className="rounded-full bg-background px-2.5 py-1 text-xs text-gray-300 hover:text-red-400"
                      >
                        #{channelName(id)} ✕
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
