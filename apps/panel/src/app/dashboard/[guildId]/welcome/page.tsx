"use client";

import { useParams } from "next/navigation";
import { useRef, useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { CreateChannelButton } from "@/components/CreateChannelButton";
import { EmbedEditor } from "@/components/EmbedEditor";
import { EmbedPreview } from "@/components/EmbedPreview";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { Channel, EmbedConfig, GuildConfig } from "@/lib/api";
import { getChannels, getGuildConfig, updateGuildConfig } from "@/lib/api";
import { previewReplacer, WELCOME_VARS } from "@/lib/embed";

type Tab = "welcome" | "goodbye";

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
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 px-8 py-6">
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 xl:flex-row">
        <div className="flex w-full max-w-lg flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="space-y-3 rounded-xl bg-[#1a1f2e] p-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-3 rounded-xl bg-[#1a1f2e] p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-7 w-20 rounded" />
              ))}
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <Skeleton className="flex-1 rounded-xl" />
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

  const { loading } = useGuildLoad(
    guildId,
    (id) => Promise.all([getGuildConfig(id), getChannels(id)]),
    ([cfg, ch]) => {
      setConfig(cfg);
      setChannels(ch);
    },
  );

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
  const activeEmbed = (tab === "welcome" ? config.welcomeEmbed : config.goodbyeEmbed) ?? undefined;
  const useEmbed = Boolean(activeEmbed);

  function setActiveEmbed(embed: EmbedConfig | undefined) {
    setConfig((c) => ({ ...c, [embedField]: embed }));
  }
  function toggleEmbed(on: boolean) {
    setActiveEmbed(on ? seedEmbed(tab, message) : undefined);
  }

  if (loading) return <WelcomeSkeleton />;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <PageHeader
          category="First Contact"
          title={
            <>
              Welcome <span className="text-[#d4a843]">&</span> Goodbye
            </>
          }
          description="Wiadomości powitalne i pożegnalne na Twoim serwerze."
          className="mb-0"
        />
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-auto p-4 sm:p-6 lg:p-8 xl:flex-row">
        <div className="flex w-full max-w-lg flex-col gap-4">
          <div className="flex gap-1 rounded-lg bg-[#1a1f2e] p-1">
            {(["welcome", "goodbye"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${tab === t ? "bg-[#d4a843] text-black" : "text-gray-400 hover:text-white"}`}
              >
                {t === "welcome" ? "👋 Welcome" : "👋 Goodbye"}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-[#1a1f2e] p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Kanał
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ChannelSelect
                value={channelId ?? ""}
                onChange={(val) =>
                  setConfig((c) =>
                    tab === "welcome"
                      ? { ...c, welcomeChannelId: val || undefined }
                      : { ...c, goodbyeChannelId: val || undefined },
                  )
                }
                channels={channels}
                placeholder="— Nie ustawiono —"
                className="min-w-0 flex-1 px-4 py-2.5"
              />
              <CreateChannelButton
                guildId={guildId}
                defaultName={tab === "welcome" ? "powitania" : "pozegnania"}
                onCreated={(ch) => {
                  setChannels((prev) =>
                    [...prev, ch].sort((a, b) => a.name.localeCompare(b.name)),
                  );
                  setConfig((c) =>
                    tab === "welcome"
                      ? { ...c, welcomeChannelId: ch.id }
                      : { ...c, goodbyeChannelId: ch.id },
                  );
                }}
              />
            </div>
          </div>

          {/* Tryb: prosty tekst vs embed */}
          <div className="flex gap-1 rounded-lg bg-[#1a1f2e] p-1">
            <button
              onClick={() => toggleEmbed(false)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${!useEmbed ? "bg-[#0f1117] text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              Prosty tekst
            </button>
            <button
              onClick={() => toggleEmbed(true)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${useEmbed ? "bg-[#0f1117] text-[#d4a843]" : "text-gray-500 hover:text-gray-300"}`}
            >
              Embed (zaawansowany)
            </button>
          </div>

          {useEmbed && activeEmbed ? (
            <div className="rounded-xl bg-[#1a1f2e] p-5">
              <EmbedEditor
                value={activeEmbed}
                onChange={setActiveEmbed}
                variables={WELCOME_VARS}
              />
            </div>
          ) : (
            <div className="rounded-xl bg-[#1a1f2e] p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Treść (Markdown + zmienne)
              </p>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setConfig((c) => ({ ...c, [field]: e.target.value }))}
                rows={4}
                className="w-full resize-none rounded-lg bg-[#0f1117] px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
              />
              <div className="mt-3">
                <p className="mb-2 text-xs text-gray-500">Kliknij zmienną aby wstawić:</p>
                <div className="flex flex-wrap gap-2">
                  {VARIABLES.map((v) => (
                    <button
                      key={v.label}
                      onClick={() => insertVariable(v.label)}
                      title={v.desc}
                      className="rounded bg-[#0f1117] px-2.5 py-1 text-xs font-mono text-[#d4a843] transition hover:bg-[#d4a843] hover:text-black"
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
            className="w-full px-6 py-3 font-semibold"
          />
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="rounded-xl bg-[#1a1f2e] p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Tak będzie to wyglądać w Discord
            </p>
            {useEmbed && activeEmbed ? (
              <EmbedPreview embed={activeEmbed} replace={previewReplacer} />
            ) : (
              <div className="rounded-lg bg-[#0d1117] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d4a843] text-sm font-bold text-black">
                    JH
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Jurassic Haven</span>
                      <span className="rounded bg-[#5865F2] px-1 py-0.5 text-xs text-white">APP</span>
                      <span className="text-xs text-gray-500">— dziś</span>
                    </div>
                    <div className="mt-2 rounded-lg border-l-4 border-[#d4a843] bg-[#1a1f2e] p-3">
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
            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Dostępne zmienne
              </p>
              <div className="flex flex-col gap-2">
                {VARIABLES.map((v) => (
                  <div key={v.label} className="flex items-center gap-3">
                    <span className="w-32 font-mono text-xs text-[#d4a843]">{v.label}</span>
                    <span className="text-xs text-gray-400">{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <HowItWorks
            steps={[
              "Wybierz kanał i napisz treść wiadomości powitalnej",
              "Użyj zmiennych ({user}, {server} itd.) aby spersonalizować tekst",
              "Zapisz — bot wyśle wiadomość gdy ktoś dołączy lub odejdzie",
              "Zakładka Goodbye działa tak samo, ale przy wyjściu z serwera",
            ]}
          />
        </div>
      </div>
    </div>
  );
}
