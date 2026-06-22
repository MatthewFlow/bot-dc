"use client";

// Podgląd renderuje avatar bota z URL-a Discorda — next/image wymagałby whitelisty,
// więc świadomie używamy zwykłego <img> (jak w EmbedPreview).
/* eslint-disable @next/next/no-img-element */

import { DoorClosed, DoorOpen } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";

import { ChannelField } from "@/components/ChannelField";
import { EmbedPreview } from "@/components/EmbedPreview";
import { PageHeader } from "@/components/PageHeader";
import { PanelCard } from "@/components/PanelCard";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { SegmentedControl, type SegmentOption } from "@/components/ui/SegmentedControl";
import { VariablesCard } from "@/components/VariablesCard";
import { WelcomeGuide } from "@/components/WelcomeGuide";
import { useBotStatus, useChannels } from "@/hooks/queries";
import { useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useConfigDraft } from "@/hooks/useConfigDraft";
import type { Channel, EmbedConfig } from "@/lib/api";
import { previewReplacer, WELCOME_VARS } from "@/lib/embed";

// Ciężki edytor embeda schodzi z initial bundle — montuje się dopiero w trybie embed.
const EmbedEditor = dynamic(
  () => import("@/components/EmbedEditor").then((m) => m.EmbedEditor),
  { loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

type Tab = "welcome" | "goodbye";

/** Zakładki z osobnymi ikonami: otwarte drzwi = wejście, zamknięte = wyjście. */
const TABS: SegmentOption<Tab>[] = [
  { value: "welcome", label: "Welcome", icon: DoorOpen },
  { value: "goodbye", label: "Goodbye", icon: DoorClosed },
];

const VARIABLES = [
  { label: "{user}", desc: "Oznaczenie użytkownika (@nick)" },
  { label: "{username}", desc: "Nazwa użytkownika" },
  { label: "{server}", desc: "Nazwa serwera" },
  { label: "{member_count}", desc: "Liczba członków" },
  { label: "{avatar}", desc: "Avatar użytkownika (URL — np. w miniaturze embeda)" },
];

const DEFAULT_WELCOME = "Siema {user}, miło że jesteś 😄";
const DEFAULT_GOODBYE = "{username} wyszedł z serwera.";

/** Domyślny embed seedowany treścią z trybu tekstowego (przy włączeniu trybu embed). */
function seedEmbed(tab: Tab, message: string): EmbedConfig {
  return {
    title: tab === "welcome" ? "🎉 Witamy na serwerze!" : "👋 Do zobaczenia!",
    description: message,
    color: 0x5865f2,
    thumbnailUrl: tab === "welcome" ? "{avatar}" : undefined,
    timestamp: true,
  };
}

/** Szkielet tylko karty z danymi — nagłówek i „Jak to działa" renderują się od razu. */
function WelcomeSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <div className="w-full">
        <div className="surface-raised rounded-xl bg-card">
          <div className="border-b border-border px-6 py-4">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export default function WelcomePage() {
  const params = useParams();
  const guildId = params.guildId as string;

  const [tab, setTab] = useState<Tab>("welcome");
  const [channels, setChannels] = useState<Channel[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { config, setConfig, saving, loading, configReady, saveConfig } =
    useConfigDraft(guildId);
  const channelsQ = useChannels(guildId);
  // Tożsamość bota (avatar + nazwa) do podglądu „jak wystawi to bot serwera".
  const botStatusQ = useBotStatus();
  // Kanały (proxy do Discorda) dopełnią się w selektach w tle — formularz nie czeka.
  useSeedOnce(channelsQ.data, setChannels);

  const handleSave = () =>
    saveConfig({
      welcomeChannelId: config.welcomeChannelId,
      goodbyeChannelId: config.goodbyeChannelId,
      welcomeMessage: config.welcomeMessage,
      goodbyeMessage: config.goodbyeMessage,
      welcomeEmbed: config.welcomeEmbed ?? null,
      goodbyeEmbed: config.goodbyeEmbed ?? null,
    });

  function insertVariable(variable: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const field = tab === "welcome" ? "welcomeMessage" : "goodbyeMessage";
    const current =
      (tab === "welcome" ? config.welcomeMessage : config.goodbyeMessage) ?? "";
    const newValue = current.slice(0, start) + variable + current.slice(end);
    setConfig((c) => ({ ...c, [field]: newValue }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  }

  const channelId = tab === "welcome" ? config.welcomeChannelId : config.goodbyeChannelId;
  const message =
    tab === "welcome"
      ? (config.welcomeMessage ?? DEFAULT_WELCOME)
      : (config.goodbyeMessage ?? DEFAULT_GOODBYE);
  const field = tab === "welcome" ? "welcomeMessage" : "goodbyeMessage";

  const embedField = tab === "welcome" ? "welcomeEmbed" : "goodbyeEmbed";
  const activeEmbed =
    (tab === "welcome" ? config.welcomeEmbed : config.goodbyeEmbed) ?? undefined;
  const useEmbed = Boolean(activeEmbed);

  function setActiveEmbed(embed: EmbedConfig | undefined) {
    setConfig((c) => ({ ...c, [embedField]: embed }));
  }
  function toggleEmbed(on: boolean) {
    setActiveEmbed(on ? seedEmbed(tab, message) : undefined);
  }

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify({
      welcomeChannelId: config.welcomeChannelId,
      goodbyeChannelId: config.goodbyeChannelId,
      welcomeMessage: config.welcomeMessage,
      goodbyeMessage: config.goodbyeMessage,
      welcomeEmbed: config.welcomeEmbed ?? null,
      goodbyeEmbed: config.goodbyeEmbed ?? null,
    }),
    handleSave,
    configReady,
  );

  const botName = botStatusQ.data?.username ?? "Jurassic Haven";
  const botAvatar = botStatusQ.data?.avatar ?? null;

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="First Contact"
        icon={DoorOpen}
        title={
          <>
            Welcome <span className="text-primary">&</span> Goodbye
          </>
        }
        description="Wiadomości powitalne i pożegnalne na Twoim serwerze."
        className="mb-0"
      />

      <WelcomeGuide />

      {loading ? (
        <WelcomeSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <div className="w-full">
            <PanelCard
              title="Wiadomość"
              description="Treść wysyłana, gdy ktoś dołączy lub opuści serwer"
            >
              {/* Welcome / Goodbye */}
              <SegmentedControl options={TABS} value={tab} onChange={setTab} />

              {/* Kanał */}
              <ChannelField
                label={tab === "welcome" ? "Kanał powitań" : "Kanał pożegnań"}
                value={channelId ?? ""}
                onChange={(val) =>
                  setConfig((c) =>
                    tab === "welcome"
                      ? { ...c, welcomeChannelId: val || undefined }
                      : { ...c, goodbyeChannelId: val || undefined },
                  )
                }
                channels={channels}
                onChannelsChange={setChannels}
                guildId={guildId}
                defaultName={tab === "welcome" ? "powitania" : "pozegnania"}
                placeholder="— Nie ustawiono —"
              />

              {/* Tryb: prosty tekst vs embed */}
              <div className="flex gap-1 rounded-lg bg-background p-1">
                <button
                  onClick={() => toggleEmbed(false)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${!useEmbed ? "bg-elevated text-white" : "text-gray-400 hover:text-gray-300"}`}
                >
                  Prosty tekst
                </button>
                <button
                  onClick={() => toggleEmbed(true)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${useEmbed ? "bg-elevated text-primary" : "text-gray-400 hover:text-gray-300"}`}
                >
                  Embed (zaawansowany)
                </button>
              </div>

              {useEmbed && activeEmbed ? (
                <EmbedEditor
                  value={activeEmbed}
                  onChange={setActiveEmbed}
                  variables={WELCOME_VARS}
                />
              ) : (
                <div>
                  <label className="mb-1 block text-xs text-gray-400">
                    Treść (Markdown + zmienne)
                  </label>
                  <textarea
                    ref={textareaRef}
                    name="welcomeMessage"
                    aria-label="Treść wiadomości (Markdown + zmienne)"
                    value={message}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, [field]: e.target.value }))
                    }
                    rows={4}
                    className="w-full resize-none rounded-lg bg-background px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-gray-400">
                      Kliknij zmienną aby wstawić:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {VARIABLES.map((v) => (
                        <button
                          key={v.label}
                          onClick={() => insertVariable(v.label)}
                          title={v.desc}
                          className="rounded bg-background px-2.5 py-1 text-xs font-mono text-primary transition hover:bg-primary hover:text-black"
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <SaveButton
                onClick={handleSave}
                saving={saving}
                autoSaveStatus={autoSaveStatus}
                className="w-full px-6 py-3 font-semibold"
              />
            </PanelCard>
          </div>

          <div className="flex flex-col gap-6 lg:sticky lg:top-20">
            <PanelCard
              title="Podgląd na żywo"
              description="Tak zobaczą to członkowie"
              bodyClassName="p-6"
            >
              {useEmbed && activeEmbed ? (
                <EmbedPreview
                  embed={activeEmbed}
                  replace={previewReplacer}
                  author={{ name: botName, avatar: botAvatar }}
                />
              ) : (
                <div className="rounded-lg bg-[#313338] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    {botAvatar ? (
                      <img src={botAvatar} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-discord text-sm font-bold text-white">
                        {botName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-white">{botName}</span>
                    <span className="rounded bg-discord px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                      BOT
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-[#dbdee1]">
                    {previewReplacer(message)}
                  </p>
                </div>
              )}
            </PanelCard>

            <VariablesCard items={VARIABLES} />
          </div>
        </div>
      )}
    </div>
  );
}
