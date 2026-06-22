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
import { MasterSwitchCard } from "@/components/MasterSwitchCard";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { TipsCard } from "@/components/TipsCard";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { NumberField } from "@/components/ui/NumberField";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { useChannels, useRoles } from "@/hooks/queries";
import { useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useConfigDraft } from "@/hooks/useConfigDraft";
import type { AutoModConfig, Channel, Role } from "@/lib/api";
import { CARD } from "@/lib/cn";

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
  blockMassMention: false,
  maxMentions: 5,
  blockCaps: false,
  blockRepeated: false,
  raidEnabled: false,
  raidJoinCount: 10,
  raidWindowSeconds: 10,
  raidAction: "alert",
};

const ACTIONS: { value: AutoModConfig["action"]; label: string; icon: LucideIcon }[] = [
  { value: "delete", label: "Usuń wiadomość", icon: Trash2 },
  { value: "warn", label: "Usuń + ostrzeż", icon: ShieldAlert },
  { value: "mute", label: "Usuń + timeout", icon: Clock },
];

type RaidAction = NonNullable<AutoModConfig["raidAction"]>;
const RAID_ACTIONS: { value: RaidAction; label: string }[] = [
  { value: "alert", label: "Tylko alert" },
  { value: "kick", label: "Alert + wyrzuć" },
  { value: "ban", label: "Alert + zbanuj" },
];

/** Szkielet tylko kart z danymi — nagłówek i „Jak to działa" renderują się od razu. */
function AutoModSkeleton() {
  return <Skeleton className="h-96 w-full rounded-xl" />;
}

export default function AutoModPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  const { config, setConfig, saving, loading, configReady, saveConfig } =
    useConfigDraft(guildId);
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const rolesQ = useRoles(guildId);
  const channelsQ = useChannels(guildId);
  // Role/kanały (proxy do Discorda) dopełnią selekty w tle — nie blokują formularza.
  useSeedOnce(rolesQ.data, setRoles);
  useSeedOnce(channelsQ.data, setChannels);

  // Scalenie z defaultami wypełnia pola brakujące w starszych zapisach.
  const am = { ...DEFAULT_AUTOMOD, ...config.autoMod };
  const setAm = (patch: Partial<AutoModConfig>) =>
    setConfig((c) => ({ ...c, autoMod: { ...DEFAULT_AUTOMOD, ...c.autoMod, ...patch } }));

  const handleSave = () => saveConfig({ autoMod: config.autoMod ?? DEFAULT_AUTOMOD });

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
          <MasterSwitchCard
            eyebrow="System auto-moderacji"
            title="Włącz auto-moderację — "
            active={am.enabled}
            activeLabel="włączona"
            inactiveLabel="wyłączona"
            hint="Gdy wyłączona, żadne filtry nie działają. Administratorzy i moderatorzy (Zarządzanie wiadomościami) są zawsze pomijani."
            onChange={(v) => setAm({ enabled: v })}
          />

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
                      <ToggleRow
                        checked={am.blockInvites}
                        onChange={(v) => setAm({ blockInvites: v })}
                        label="Blokuj zaproszenia Discord"
                        desc="Wiadomości z linkami discord.gg / invite."
                      />
                      <ToggleRow
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
                        <ToggleRow
                          checked={am.blockMassMention ?? false}
                          onChange={(v) => setAm({ blockMassMention: v })}
                          label="Masowe oznaczenia"
                          desc="Blokuj @everyone/@here oraz nadmiar oznaczeń."
                        />
                        {am.blockMassMention && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-300">
                            <span>Maks.</span>
                            <NumberField
                              name="maxMentions"
                              ariaLabel="Maksymalna liczba oznaczeń"
                              min={1}
                              max={50}
                              value={am.maxMentions ?? 5}
                              onChange={(v) => setAm({ maxMentions: v })}
                            />
                            <span>oznaczeń.</span>
                          </div>
                        )}
                      </div>

                      <ToggleRow
                        checked={am.blockCaps ?? false}
                        onChange={(v) => setAm({ blockCaps: v })}
                        label="Blokuj CAPS"
                        desc="Wiadomości pisane głównie WIELKIMI literami."
                      />

                      <ToggleRow
                        checked={am.blockRepeated ?? false}
                        onChange={(v) => setAm({ blockRepeated: v })}
                        label="Powtarzanie znaków"
                        desc="Np. „aaaaaaaaaa” albo „!!!!!!!!!!”."
                      />

                      <div className="border-t border-border pt-4">
                        <ToggleRow
                          checked={am.spamEnabled}
                          onChange={(v) => setAm({ spamEnabled: v })}
                          label="Anty-spam"
                          desc="Reaguj, gdy użytkownik wysyła zbyt wiele wiadomości w krótkim czasie."
                        />
                        {am.spamEnabled && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-300">
                            <span>Maks.</span>
                            <NumberField
                              name="spamMaxMessages"
                              ariaLabel="Maksymalna liczba wiadomości"
                              min={2}
                              max={50}
                              value={am.spamMaxMessages}
                              onChange={(v) => setAm({ spamMaxMessages: v })}
                            />
                            <span>wiadomości w</span>
                            <NumberField
                              name="spamWindowSeconds"
                              ariaLabel="Okno czasowe w sekundach"
                              min={1}
                              max={60}
                              value={am.spamWindowSeconds}
                              onChange={(v) => setAm({ spamWindowSeconds: v })}
                            />
                            <span>sekund.</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-border pt-4">
                        <ToggleRow
                          checked={am.raidEnabled ?? false}
                          onChange={(v) => setAm({ raidEnabled: v })}
                          label="Wykrywanie raidów"
                          desc="Alarmuj, gdy wielu użytkowników wejdzie w krótkim czasie."
                        />
                        {am.raidEnabled && (
                          <div className="mt-3 flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                              <NumberField
                                name="raidJoinCount"
                                ariaLabel="Liczba wejść"
                                min={2}
                                max={100}
                                value={am.raidJoinCount ?? 10}
                                onChange={(v) => setAm({ raidJoinCount: v })}
                              />
                              <span>wejść w</span>
                              <NumberField
                                name="raidWindowSeconds"
                                ariaLabel="Okno czasowe w sekundach"
                                min={2}
                                max={300}
                                value={am.raidWindowSeconds ?? 10}
                                onChange={(v) => setAm({ raidWindowSeconds: v })}
                              />
                              <span>sekund.</span>
                            </div>
                            <ChoiceChips
                              options={RAID_ACTIONS}
                              value={am.raidAction ?? "alert"}
                              onChange={(v) => setAm({ raidAction: v })}
                              size="sm"
                            />
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
                  <ChoiceChips
                    options={ACTIONS}
                    value={am.action}
                    onChange={(v) => setAm({ action: v })}
                  />
                  {am.action === "mute" && (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                      <span>Czas timeoutu:</span>
                      <NumberField
                        name="muteDurationSeconds"
                        ariaLabel="Czas timeoutu w sekundach"
                        min={10}
                        max={2419200}
                        value={am.muteDurationSeconds}
                        onChange={(v) => setAm({ muteDurationSeconds: v })}
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
