"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getGuildConfig, getChannels, updateGuildConfig } from "@/lib/api";
import type { GuildConfig, Channel } from "@/lib/api";

type Tab = "welcome" | "goodbye";

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
      await updateGuildConfig(token, guildId, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  }

  const channelId = tab === "welcome" ? config.welcomeChannelId : config.goodbyeChannelId;
  const selectedChannel = channels.find((ch) => ch.id === channelId);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
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

      <div className="flex flex-1 gap-6 overflow-hidden p-8">
        {/* Left panel */}
        <div className="flex w-full max-w-lg flex-col gap-6">
          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-[#1a1f2e] p-1">
            {(["welcome", "goodbye"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                  tab === t
                    ? "bg-[#d4a843] text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t === "welcome" ? "👋 Welcome" : "👋 Goodbye"}
              </button>
            ))}
          </div>

          {/* Channel select */}
          <div className="rounded-xl bg-[#1a1f2e] p-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
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
              className="mt-2 w-full rounded-lg bg-[#0f1117] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
            >
              <option value="">— Nie ustawiono —</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  # {ch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#d4a843] px-6 py-3 font-semibold text-black transition hover:bg-[#c49b3a] disabled:opacity-50"
          >
            {saving ? "Zapisywanie..." : saved ? "Zapisano ✓" : "Zapisz zmiany"}
          </button>
        </div>

        {/* Right panel — preview */}
        <div className="flex-1 rounded-xl bg-[#1a1f2e] p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Tak będzie to wyglądać w Discord
          </p>

          <div className="rounded-lg bg-[#0d1117] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d4a843] text-sm font-bold text-black">
                JH
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Jurassic Haven</span>
                  <span className="rounded bg-[#5865F2] px-1 py-0.5 text-xs text-white">APP</span>
                  <span className="text-xs text-gray-500">— dziś</span>
                </div>
                <div className="mt-2 rounded-lg border-l-4 border-[#d4a843] bg-[#1a1f2e] p-3">
                  <p className="text-sm font-semibold text-white">
                    {tab === "welcome" ? "🎉 Witamy na serwerze!" : "👋 Do zobaczenia!"}
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    {tab === "welcome"
                      ? "Nowy członek dołączył do serwera."
                      : "Członek opuścił serwer."}
                  </p>
                  {selectedChannel && (
                    <p className="mt-2 text-xs text-gray-500">
                      Kanał: #{selectedChannel.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}