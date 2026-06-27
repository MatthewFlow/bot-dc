"use client";

import { Hash, Plus, Trash2, Users, Volume2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { EntitySelect } from "@/components/EntitySelect";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useCategories, useVoiceChannels } from "@/hooks/queries";
import { useConfigDraft } from "@/hooks/useConfigDraft";
import type { AutoVoiceHub } from "@/lib/api";
import { CARD } from "@/lib/cn";

const DEFAULT_TEMPLATE = "🔊 {user}";

export default function AutoVoicePage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const { config, setConfig, saving, loading, saveConfig } = useConfigDraft(guildId);
  const voiceQ = useVoiceChannels(guildId);
  const catQ = useCategories(guildId);
  const voiceChannels = voiceQ.data ?? [];
  const categories = catQ.data ?? [];

  const hubs = config.autoVoice ?? [];
  const setHubs = (next: AutoVoiceHub[]) => setConfig((c) => ({ ...c, autoVoice: next }));

  const [chId, setChId] = useState("");
  const [catId, setCatId] = useState("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [limit, setLimit] = useState(0);

  const voiceName = (id: string) => voiceChannels.find((c) => c.id === id)?.name ?? id;
  const catName = (id?: string) =>
    id ? (categories.find((c) => c.id === id)?.name ?? id) : "kategoria twórcy";

  function addHub() {
    if (!chId) {
      toast("Wybierz kanał-twórcę.", "error");
      return;
    }
    if (hubs.some((h) => h.channelId === chId)) {
      toast("Ten kanał jest już hubem.", "error");
      return;
    }
    setHubs([
      ...hubs,
      {
        channelId: chId,
        categoryId: catId || undefined,
        nameTemplate: template.trim() || DEFAULT_TEMPLATE,
        userLimit: limit > 0 ? limit : undefined,
      },
    ]);
    setChId("");
    setCatId("");
    setTemplate(DEFAULT_TEMPLATE);
    setLimit(0);
  }

  async function handleSave() {
    await saveConfig({ autoVoice: hubs });
  }

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Społeczność"
        icon={Volume2}
        title={
          <>
            Auto-<span className="italic text-primary">kanały głosowe</span>
          </>
        }
        description="Wejście na „kanał-twórcę” tworzy nowy kanał głosowy; bot kasuje go, gdy zostanie pusty."
        className="mb-0"
      />

      <p className="rounded-lg border border-border bg-card/60 px-4 py-2.5 text-xs text-gray-400">
        Bot potrzebuje uprawnień{" "}
        <strong className="text-gray-300">Zarządzanie kanałami</strong> i{" "}
        <strong className="text-gray-300">Przenoszenie członków</strong>. Twórca dostaje
        kontrolę nad swoim kanałem (nazwa, limit, wyrzucanie).
      </p>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Dodawanie hubu */}
        <div className={CARD}>
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Nowy kanał-twórca</p>
              <p className="text-xs text-gray-400">Wybierz głosówkę „lobby”</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-6">
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Kanał-twórca <span className="text-destructive">*</span>
              </label>
              <EntitySelect
                value={chId}
                onChange={setChId}
                items={voiceChannels}
                placeholder={
                  voiceQ.isLoading ? "Ładowanie…" : "— Wybierz kanał głosowy —"
                }
                className="w-full px-3 py-2.5"
                renderLabel={(c) => `🔊 ${c.name}`}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Kategoria docelowa (opcjonalnie)
              </label>
              <EntitySelect
                value={catId}
                onChange={setCatId}
                items={categories}
                placeholder="— Kategoria twórcy —"
                className="w-full px-3 py-2.5"
                renderLabel={(c) => `📁 ${c.name}`}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400" htmlFor="av-template">
                Szablon nazwy
              </label>
              <input
                id="av-template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                maxLength={100}
                placeholder={DEFAULT_TEMPLATE}
                className="w-full rounded-lg bg-background px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-gray-500">
                Zmienne: <code className="text-gray-400">{"{user}"}</code> = nick,{" "}
                <code className="text-gray-400">{"{count}"}</code> = numer.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400" htmlFor="av-limit">
                Limit osób (0 = bez limitu)
              </label>
              <input
                id="av-limit"
                type="number"
                min={0}
                max={99}
                value={limit}
                onChange={(e) =>
                  setLimit(Math.max(0, Math.min(99, Number(e.target.value))))
                }
                className="w-28 rounded-lg bg-background px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={addHub}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary/15 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/25"
            >
              <Plus className="size-4" /> Dodaj do listy
            </button>
          </div>
        </div>

        {/* Lista hubów */}
        <div className={`${CARD} flex flex-col`}>
          <div className="flex items-center justify-between gap-2 border-b border-border px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Volume2 className="size-5" />
              </span>
              <p className="text-sm font-semibold text-white">Kanały-twórcy</p>
            </div>
            <SaveButton onClick={handleSave} saving={saving} label="Zapisz zmiany" />
          </div>

          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : hubs.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-gray-400">
              Brak kanałów-twórców. Dodaj pierwszy po lewej i zapisz.
            </p>
          ) : (
            <div className="flex flex-col">
              {hubs.map((h) => (
                <div
                  key={h.channelId}
                  className="flex items-center gap-3 border-b border-border px-6 py-3 last:border-0"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Volume2 className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      🔊 {voiceName(h.channelId)}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Hash className="size-3" />
                        {h.nameTemplate || DEFAULT_TEMPLATE}
                      </span>
                      <span>📁 {catName(h.categoryId)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" />
                        {h.userLimit && h.userLimit > 0 ? h.userLimit : "∞"}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setHubs(hubs.filter((x) => x.channelId !== h.channelId))
                    }
                    title="Usuń"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
