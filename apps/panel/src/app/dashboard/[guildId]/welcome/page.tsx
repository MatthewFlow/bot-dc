"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/Skeleton";
import type { Channel, GuildConfig } from "@/lib/api";
import { getChannels, getGuildConfig, updateGuildConfig } from "@/lib/api";

type Tab = "welcome" | "goodbye";

const VARIABLES = [
  { label: "{user}", desc: "Oznaczenie użytkownika" },
  { label: "{username}", desc: "Nazwa użytkownika" },
  { label: "{server}", desc: "Nazwa serwera" },
  { label: "{member_count}", desc: "Liczba członków" },
];

const DEFAULT_WELCOME = "Siema {user}, miło że jesteś 😄";
const DEFAULT_GOODBYE = "{username} wyszedł z serwera.";

function resolvePreview(template: string): string {
  return template
    .replace(/{user}/g, "@nowy_użytkownik")
    .replace(/{username}/g, "nowy_użytkownik")
    .replace(/{server}/g, "Jurassic Haven")
    .replace(/{member_count}/g, "1,337");
}

function WelcomeSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 px-8 py-6">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="flex flex-1 gap-6 p-8">
        <div className="flex w-full max-w-lg flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="rounded-xl bg-[#1a1f2e] p-5 space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="rounded-xl bg-[#1a1f2e] p-5 space-y-3">
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
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;

  const [tab, setTab] = useState<Tab>("welcome");
  const [config, setConfig] = useState<GuildConfig>({});
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("jh_token");
    if (!token) {
      router.replace("/");
      return;
    }

    Promise.all([getGuildConfig(token, guildId), getChannels(token, guildId)])
      .then(([cfg, ch]) => {
        setConfig(cfg);
        setChannels(ch);
      })
      .catch(() => router.replace("/dashboard"))
      .finally(() => setLoading(false));
  }, [guildId, router]);

  async function handleSave() {
    const token = localStorage.getItem("jh_token");
    if (!token) return;
    setSaving(true);
    try {
      await updateGuildConfig(token, guildId, {
        welcomeChannelId: config.welcomeChannelId,
        goodbyeChannelId: config.goodbyeChannelId,
        welcomeMessage: config.welcomeMessage,
        goodbyeMessage: config.goodbyeMessage,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Nie udało się zapisać.");
      setTimeout(() => setError(null), 4000);
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

  if (loading) return <WelcomeSkeleton />;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 px-8 py-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          First Contact
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Welcome <span className="text-[#d4a843]">&</span> Goodbye
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Wiadomości powitalne i pożegnalne na Twoim serwerze.
        </p>
      </div>

      <div className="flex flex-1 gap-6 overflow-auto p-8">
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
            <select
              value={channelId ?? ""}
              onChange={(e) => {
                const val = e.target.value || undefined;
                setConfig((c) =>
                  tab === "welcome"
                    ? { ...c, welcomeChannelId: val }
                    : { ...c, goodbyeChannelId: val },
                );
              }}
              className="w-full rounded-lg bg-[#0f1117] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
            >
              <option value="">— Nie ustawiono —</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  # {ch.name}
                </option>
              ))}
            </select>
          </div>

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

          <div className="flex flex-col gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#d4a843] px-6 py-3 font-semibold text-black transition hover:bg-[#c49b3a] disabled:opacity-50"
            >
              {saving ? "Zapisywanie..." : saved ? "Zapisano ✓" : "Zapisz zmiany"}
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </div>

        <div className="flex-1 rounded-xl bg-[#1a1f2e] p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Tak będzie to wyglądać w Discord
          </p>
          <div className="rounded-lg bg-[#0d1117] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d4a843] text-sm font-bold text-black">
                JH
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Jurassic Haven</span>
                  <span className="rounded bg-[#5865F2] px-1 py-0.5 text-xs text-white">
                    APP
                  </span>
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
      </div>
    </div>
  );
}
