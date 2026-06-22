"use client";

import { Hash, Languages, Send, Settings } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { CardHead } from "@/components/CardHead";
import { ChannelField } from "@/components/ChannelField";
import { HowItWorks } from "@/components/HowItWorks";
import { MasterSwitchCard } from "@/components/MasterSwitchCard";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChannels } from "@/hooks/queries";
import { useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useConfigDraft } from "@/hooks/useConfigDraft";
import type { Channel, TranslationConfig, TranslationLang } from "@/lib/api";
import { CARD } from "@/lib/cn";

const DEFAULT_TRANSLATION: TranslationConfig = {
  enabled: false,
  sourceChannelId: undefined,
  targetLang: "PL",
};

const LANGS: { value: TranslationLang; label: string }[] = [
  { value: "PL", label: "🇵🇱 Polski" },
  { value: "EN-GB", label: "🇬🇧 English" },
  { value: "DE", label: "🇩🇪 Deutsch" },
  { value: "ES", label: "🇪🇸 Español" },
  { value: "FR", label: "🇫🇷 Français" },
];

export default function TranslationPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  const { config, setConfig, saving, loading, configReady, saveConfig } =
    useConfigDraft(guildId);
  const [channels, setChannels] = useState<Channel[]>([]);

  const channelsQ = useChannels(guildId);
  useSeedOnce(channelsQ.data, setChannels);

  const tr = { ...DEFAULT_TRANSLATION, ...config.translation };
  const setTr = (patch: Partial<TranslationConfig>) =>
    setConfig((c) => ({
      ...c,
      translation: { ...DEFAULT_TRANSLATION, ...c.translation, ...patch },
    }));

  const handleSave = () =>
    saveConfig({ translation: config.translation ?? DEFAULT_TRANSLATION });

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify(config.translation ?? DEFAULT_TRANSLATION),
    handleSave,
    configReady,
  );

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Integracje"
        icon={Languages}
        title={
          <>
            Tłuma<span className="italic text-primary">czenia</span>
          </>
        }
        description="Auto-tłumaczenie wiadomości ze śledzonego kanału (np. ogłoszenia gry)."
        className="mb-0"
      />

      <HowItWorks
        subtitle="Cztery kroki do tłumaczeń na żywo"
        cards={[
          {
            icon: Hash,
            title: "Wskaż kanał-źródło",
            text: "Kanał, na który wpadają wiadomości do przetłumaczenia (np. śledzone ogłoszenia).",
          },
          {
            icon: Languages,
            title: "Wybierz język",
            text: "Język docelowy tłumaczenia — domyślnie polski.",
          },
          {
            icon: Send,
            title: "Bot tłumaczy",
            text: "Nowa wiadomość → bot odpowiada embedem z tłumaczeniem zaraz pod nią.",
          },
          {
            icon: Settings,
            title: "Zachowuje oryginał",
            text: "Bloki kodu, numery wersji i nazwy własne (np. gatunki) zostają nietknięte.",
          },
        ]}
      />

      {loading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : (
        <>
          <MasterSwitchCard
            eyebrow="System tłumaczeń"
            title="Włącz auto-tłumaczenie — "
            active={tr.enabled}
            activeLabel="aktywne"
            inactiveLabel="wyłączone"
            hint="Gdy wyłączone, żadne wiadomości nie są tłumaczone."
            onChange={(v) => setTr({ enabled: v })}
          />

          <div
            className={tr.enabled ? "" : "pointer-events-none opacity-50"}
            aria-disabled={!tr.enabled}
          >
            <div className={`${CARD} max-w-2xl`}>
              <CardHead
                icon={Languages}
                title="Konfiguracja"
                subtitle="Kanał-źródło i język docelowy"
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
                <ChannelField
                  label="Kanał-źródło"
                  value={tr.sourceChannelId ?? ""}
                  onChange={(v) => setTr({ sourceChannelId: v || undefined })}
                  channels={channels}
                  onChannelsChange={setChannels}
                  guildId={guildId}
                  defaultName="the-isle-news"
                  hint="Kanał, którego nowe wiadomości bot będzie tłumaczył."
                />

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-300">
                    Język docelowy
                  </label>
                  <Select
                    value={tr.targetLang}
                    onValueChange={(v) => setTr({ targetLang: v as TranslationLang })}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="rounded-lg border border-border bg-background/40 p-3 text-xs text-gray-400">
                  Tłumaczenie realizuje DeepL. Bloki kodu, numery wersji i nazwy własne
                  (np. gatunki dinozaurów) zostają w oryginale.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
