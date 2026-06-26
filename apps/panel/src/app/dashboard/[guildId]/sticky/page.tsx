"use client";

import { MessageSquare, Pencil, Pin, Sparkles, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EmbedPreview } from "@/components/EmbedPreview";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useChannels, useStickies } from "@/hooks/queries";
import type { EmbedConfig, StickyMessage, StickyMode } from "@/lib/api";
import { deleteSticky, upsertSticky } from "@/lib/api";
import { CARD } from "@/lib/cn";

const EmbedEditor = dynamic(
  () => import("@/components/EmbedEditor").then((m) => m.EmbedEditor),
  { loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
);

const EMPTY_EMBED: EmbedConfig = { description: "" };

export default function StickyPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const channelsQ = useChannels(guildId);
  const stickyQ = useStickies(guildId);
  const channels = channelsQ.data ?? [];
  const list = stickyQ.data ?? [];

  const [channelId, setChannelId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<StickyMode>("text");
  const [content, setContent] = useState("");
  const [embed, setEmbed] = useState<EmbedConfig>(EMPTY_EMBED);
  const [confirmChannel, setConfirmChannel] = useState<string | null>(null);

  const channelName = (id: string) => channels.find((ch) => ch.id === id)?.name ?? id;

  const hasContent =
    mode === "text"
      ? content.trim().length > 0
      : (embed.description?.trim().length ?? 0) > 0 ||
        (embed.title?.trim().length ?? 0) > 0;
  const canSave = channelId !== "" && (!enabled || hasContent);

  function resetForm() {
    setChannelId("");
    setEnabled(true);
    setMode("text");
    setContent("");
    setEmbed(EMPTY_EMBED);
  }

  function editExisting(s: StickyMessage) {
    setChannelId(s.channelId);
    setEnabled(s.enabled);
    setMode(s.mode);
    setContent(s.content ?? "");
    setEmbed(s.embed ?? EMPTY_EMBED);
  }

  async function handleSave() {
    if (!canSave) {
      toast("Wybierz kanał i dodaj treść.", "error");
      return;
    }
    try {
      await upsertSticky(guildId, channelId, {
        enabled,
        mode,
        content: content.trim() || undefined,
        embed: mode === "embed" ? embed : undefined,
      });
      await stickyQ.refetch();
      toast(
        enabled ? "Sticky zapisany i opublikowany." : "Sticky zapisany (wyłączony).",
        "success",
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się zapisać.", "error");
    }
  }

  async function handleDelete(ch: string) {
    setConfirmChannel(null);
    try {
      await deleteSticky(guildId, ch);
      if (ch === channelId) resetForm();
      await stickyQ.refetch();
      toast("Sticky usunięty.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się usunąć.", "error");
    }
  }

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Społeczność"
        icon={Pin}
        title={
          <>
            Sticky <span className="italic text-primary">messages</span>
          </>
        }
        description="Wiadomość, którą bot trzyma na dole kanału — wraca na spód po każdej aktywności."
        className="mb-0"
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Edytor */}
        <div className={CARD}>
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Pin className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">
                {channelId ? "Edytuj sticky" : "Nowy sticky"}
              </p>
              <p className="text-xs text-gray-400">Jeden sticky na kanał</p>
            </div>
          </div>

          <div className="flex flex-col gap-5 p-6">
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Kanał <span className="text-destructive">*</span>
              </label>
              <ChannelSelect
                value={channelId}
                onChange={setChannelId}
                channels={channels}
                className="w-full px-3 py-2.5"
              />
            </div>

            {/* Tryb treści */}
            <div className="flex gap-2">
              {(["text", "embed"] as StickyMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    mode === m
                      ? "bg-primary text-black"
                      : "border border-border bg-background text-gray-300 hover:text-white"
                  }`}
                >
                  {m === "text" ? (
                    <MessageSquare className="size-4" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {m === "text" ? "Tekst" : "Embed"}
                </button>
              ))}
            </div>

            {mode === "text" ? (
              <div>
                <label className="mb-1 block text-xs text-gray-400" htmlFor="sticky-text">
                  Treść
                </label>
                <textarea
                  id="sticky-text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder="np. 📌 Przeczytaj regulamin na #zasady przed pisaniem."
                  className="w-full resize-y rounded-lg bg-background px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {content.length}/2000
                </p>
              </div>
            ) : (
              <EmbedEditor value={embed} onChange={setEmbed} />
            )}

            {/* Włączony */}
            <button
              onClick={() => setEnabled((v) => !v)}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <span className="text-gray-300">Sticky włączony</span>
              <span
                className={`relative h-5 w-9 rounded-full transition ${
                  enabled ? "bg-primary" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-white transition ${
                    enabled ? "left-[1.125rem]" : "left-0.5"
                  }`}
                />
              </span>
            </button>

            <div className="flex items-center justify-between border-t border-border pt-4">
              {channelId && (
                <button
                  onClick={resetForm}
                  className="text-xs text-gray-400 transition hover:text-gray-200"
                >
                  Wyczyść
                </button>
              )}
              <SaveButton
                onClick={handleSave}
                disabled={!canSave}
                label="Zapisz sticky"
                className="ml-auto px-5 py-2"
              />
            </div>
          </div>
        </div>

        {/* Podgląd embeda (tylko tryb embed) */}
        {mode === "embed" && (
          <div className="lg:sticky lg:top-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Podgląd
            </p>
            <EmbedPreview embed={embed} />
          </div>
        )}
      </div>

      {/* Lista istniejących */}
      <div className={`${CARD} flex flex-col`}>
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-primary">
            <Pin className="size-4" />
          </span>
          <p className="text-sm font-semibold text-white">Aktywne sticky</p>
        </div>

        {stickyQ.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : list.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            Brak sticky. Dodaj pierwszy powyżej.
          </p>
        ) : (
          <div className="flex flex-col">
            {list.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Pin className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    #{channelName(s.channelId)}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {s.mode === "embed" ? "Embed" : "Tekst"} ·{" "}
                    {s.enabled ? (
                      <span className="text-success">włączony</span>
                    ) : (
                      <span className="text-gray-500">wyłączony</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => editExisting(s)}
                  title="Edytuj"
                  className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white/5 hover:text-white"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => setConfirmChannel(s.channelId)}
                  title="Usuń"
                  className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmChannel && (
        <ConfirmModal
          message="Usunąć sticky z tego kanału? Wiadomość zostanie skasowana."
          onCancel={() => setConfirmChannel(null)}
          onConfirm={() => handleDelete(confirmChannel)}
        />
      )}
    </div>
  );
}
