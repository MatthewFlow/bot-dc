"use client";

import { DoorClosed, DoorOpen, type LucideIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";

import { ChannelField } from "@/components/ChannelField";
import { EmbedEditor } from "@/components/EmbedEditor";
import { EmbedPreview } from "@/components/EmbedPreview";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { PanelCard } from "@/components/PanelCard";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { VariablesList } from "@/components/VariablesList";
import { useChannels, useGuildConfig } from "@/hooks/queries";
import { useRedirectOnError, useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { Channel, EmbedConfig, GuildConfig } from "@/lib/api";
import { updateGuildConfig } from "@/lib/api";
import { previewReplacer, WELCOME_VARS } from "@/lib/embed";

type Tab = "welcome" | "goodbye";

/** Zakładki z osobnymi ikonami: otwarte drzwi = wejście, zamknięte = wyjście. */
const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: "welcome", label: "Welcome", Icon: DoorOpen },
  { id: "goodbye", label: "Goodbye", Icon: DoorClosed },
];

const VARIABLES = [
  { label: "{user}", desc: "Oznaczenie użytkownika" },
  { label: "{username}", desc: "Nazwa użytkownika" },
  { label: "{server}", desc: "Nazwa serwera" },
  { label: "{member_count}", desc: "Liczba członków" },
  { label: "{avatar}", desc: "Awatar użytkownika (URL — np. w miniaturze embeda)" },
];

const DEFAULT_WELCOME = "Siema {user}, miło że jesteś 😄";
const DEFAULT_GOODBYE = "{username} wyszedł z serwera.";

function resolvePreview(template: string): string {
  return template
    .replace(/{user}/g, "@nowy_użytkownik")
    .replace(/{username}/g, "nowy_użytkownik")
    .replace(/{server}/g, "Jurassic Haven")
    .replace(/{member_count}/g, "1,337")
    .replace(/{avatar}/g, "https://cdn.discordapp.com/embed/avatars/0.png");
}

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

function WelcomeSkeleton() {
  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
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
    </div>
  );
}

export default function WelcomePage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("welcome");
  const [config, setConfig] = useState<GuildConfig>({});
  const [channels, setChannels] = useState<Channel[]>([]);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const configQ = useGuildConfig(guildId);
  const channelsQ = useChannels(guildId);
  const loading = configQ.isLoading || channelsQ.isLoading;
  useRedirectOnError(configQ.isError, configQ.error);
  const configReady = useSeedOnce(configQ.data, setConfig);
  useSeedOnce(channelsQ.data, setChannels);

  async function handleSave() {
    setSaving(true);
    try {
      await updateGuildConfig(guildId, {
        welcomeChannelId: config.welcomeChannelId,
        goodbyeChannelId: config.goodbyeChannelId,
        welcomeMessage: config.welcomeMessage,
        goodbyeMessage: config.goodbyeMessage,
        welcomeEmbed: config.welcomeEmbed ?? null,
        goodbyeEmbed: config.goodbyeEmbed ?? null,
      });
      toast("Zapisano zmiany.", "success");
    } catch {
      toast("Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

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

  if (loading) return <WelcomeSkeleton />;

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

      <HowItWorks
        steps={[
          "Wybierz kanał powitań i napisz treść — prosty tekst albo bogaty embed.",
          "Wstaw zmienne ({user}, {server}, {member_count}, {avatar}), by spersonalizować wiadomość.",
          "Zakładka Goodbye działa tak samo, ale wysyła się przy wyjściu z serwera.",
          "Zmiany zapisują się automatycznie — bot reaguje od razu, bez restartu.",
        ]}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="w-full">
          <PanelCard title="Wiadomość">
            {/* Welcome / Goodbye */}
            <div className="flex gap-1 rounded-lg bg-background p-1">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition ${tab === id ? "bg-primary text-black" : "text-gray-300 hover:text-white"}`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* Kanał */}
            <ChannelField
              label="Kanał"
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
                  onChange={(e) => setConfig((c) => ({ ...c, [field]: e.target.value }))}
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

        <PanelCard title="Podgląd" bodyClassName="p-6" className="lg:sticky lg:top-20">
          {useEmbed && activeEmbed ? (
            <EmbedPreview embed={activeEmbed} replace={previewReplacer} />
          ) : (
            <div className="rounded-lg bg-sidebar p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-black">
                  JH
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      Jurassic Haven
                    </span>
                    <span className="rounded bg-discord px-1 py-0.5 text-xs text-white">
                      APP
                    </span>
                    <span className="text-xs text-gray-400">— dziś</span>
                  </div>
                  <div className="mt-2 rounded-lg border-l-4 border-primary bg-card p-3">
                    <p className="text-sm font-semibold text-white">
                      {tab === "welcome" ? "🎉 Witamy na serwerze!" : "👋 Do zobaczenia!"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-300">
                      {resolvePreview(message)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <VariablesList items={VARIABLES} className="mt-6" />
        </PanelCard>
      </div>
    </div>
  );
}
