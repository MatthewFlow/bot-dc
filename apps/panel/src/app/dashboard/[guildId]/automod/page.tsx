"use client";

import {
  Clock,
  Gavel,
  type LucideIcon,
  Settings,
  ShieldAlert,
  ShieldBan,
  SlidersHorizontal,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { CardHead } from "@/components/CardHead";
import { ExemptLists } from "@/components/ExemptLists";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { TipsCard } from "@/components/TipsCard";
import { useToast } from "@/components/toast";
import { Switch } from "@/components/ui/switch";
import { useChannels, useGuildConfig, useRoles } from "@/hooks/queries";
import { useRedirectOnError, useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { AutoModConfig, Channel, GuildConfig, Role } from "@/lib/api";
import { updateGuildConfig } from "@/lib/api";

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

const ACTIONS: { value: AutoModConfig["action"]; label: string; icon: LucideIcon }[] = [
  { value: "delete", label: "Usuń wiadomość", icon: Trash2 },
  { value: "warn", label: "Usuń + ostrzeż", icon: ShieldAlert },
  { value: "mute", label: "Usuń + timeout", icon: Clock },
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

/** Szkielet tylko kart z danymi — nagłówek i „Jak to działa" renderują się od razu. */
function AutoModSkeleton() {
  return <Skeleton className="h-96 w-full rounded-xl" />;
}

const CARD = "surface-raised rounded-xl border border-border bg-card";
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

  const configQ = useGuildConfig(guildId);
  const rolesQ = useRoles(guildId);
  const channelsQ = useChannels(guildId);
  // Bramka tylko na config; role/kanały (proxy do Discorda) dopełnią selekty w tle.
  const loading = configQ.isLoading;
  useRedirectOnError(configQ.isError, configQ.error);
  const configReady = useSeedOnce(configQ.data, setConfig);
  useSeedOnce(rolesQ.data, setRoles);
  useSeedOnce(channelsQ.data, setChannels);

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

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify(config.autoMod ?? DEFAULT_AUTOMOD),
    handleSave,
    configReady,
  );

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
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

      <HowItWorks
        subtitle="Cztery kroki do automatycznej ochrony serwera"
        cards={[
          {
            icon: SlidersHorizontal,
            title: "Włącz filtry",
            text: "Zaznacz, co bot ma wykrywać: zaproszenia, linki, słowa, spam.",
          },
          {
            icon: Gavel,
            title: "Ustaw akcję",
            text: "Przy wykryciu: usunięcie, usunięcie + ostrzeżenie albo timeout.",
          },
          {
            icon: UserPlus,
            title: "Dodaj wyjątki",
            text: "Zaufane role i kanały są pomijane — staff automatycznie też.",
          },
          {
            icon: Settings,
            title: "Uprawnienia bota",
            text: "Bot potrzebuje „Zarządzanie wiadomościami” (i „Moderuj” do timeoutów).",
          },
        ]}
      />

      {loading ? (
        <AutoModSkeleton />
      ) : (
        <>
          {/* Master switch */}
          <div className={`${CARD} flex items-center justify-between gap-4 p-6`}>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                System auto-moderacji
              </p>
              <p className="text-base font-semibold text-white">
                Włącz auto-moderację —{" "}
                <span className={am.enabled ? "text-green-400" : "text-gray-400"}>
                  {am.enabled ? "włączona" : "wyłączona"}
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Gdy wyłączona, żadne filtry nie działają. Administratorzy i moderatorzy
                (Zarządzanie wiadomościami) są zawsze pomijani.
              </p>
            </div>
            <Switch
              checked={am.enabled}
              onCheckedChange={(v) => setAm({ enabled: v })}
              className="shrink-0"
            />
          </div>

          <div
            className={am.enabled ? "" : "pointer-events-none opacity-50"}
            aria-disabled={!am.enabled}
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                {/* Filtry */}
                <div className="min-w-0 flex-1">
                  <div className={CARD}>
                    <CardHead
                      icon={SlidersHorizontal}
                      title="Filtry"
                      subtitle="Co bot ma wykrywać i blokować"
                      action={
                        <SaveButton
                          onClick={handleSave}
                          saving={saving}
                          autoSaveStatus={autoSaveStatus}
                          className="px-4 py-1.5 text-xs"
                        />
                      }
                    />
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
                </div>

                {/* Wyjątki + Wskazówki */}
                <div className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
                  <div className={CARD}>
                    <CardHead
                      icon={UserPlus}
                      title="Wyjątki"
                      subtitle="Pomijane przy każdym filtrze"
                    />
                    <ExemptLists
                      roles={roles}
                      channels={channels}
                      roleIds={am.exemptRoleIds}
                      channelIds={am.exemptChannelIds}
                      onRoleIdsChange={(ids) => setAm({ exemptRoleIds: ids })}
                      onChannelIdsChange={(ids) => setAm({ exemptChannelIds: ids })}
                    />
                  </div>

                  <TipsCard
                    items={[
                      <>
                        Rola bota musi być <strong className="text-white">wyżej</strong>{" "}
                        niż role karanych, by mógł usuwać i wyciszać.
                      </>,
                      <>
                        Zacznij od <strong className="text-white">samego usuwania</strong>
                        , dopiero potem włącz ostrzeżenia / timeouty.
                      </>,
                    ]}
                  />
                </div>
              </div>

              {/* Akcja przy wykryciu */}
              <div className={CARD}>
                <CardHead
                  icon={Gavel}
                  title="Akcja przy wykryciu"
                  subtitle="Co bot robi, gdy filtr coś złapie"
                />
                <div className="flex flex-col gap-4 p-6">
                  <div className="flex flex-wrap gap-2">
                    {ACTIONS.map((a) => {
                      const active = am.action === a.value;
                      return (
                        <button
                          key={a.value}
                          onClick={() => setAm({ action: a.value })}
                          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${
                            active
                              ? "bg-primary font-semibold text-primary-foreground"
                              : "border border-border bg-background text-gray-300 hover:text-white"
                          }`}
                        >
                          <a.icon className="size-4" />
                          {a.label}
                        </button>
                      );
                    })}
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
                    Każda akcja usuwa wiadomość. „Ostrzeż” zapisuje warn, „Timeout”
                    wycisza użytkownika. Obie trafiają do logów moderacji.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
