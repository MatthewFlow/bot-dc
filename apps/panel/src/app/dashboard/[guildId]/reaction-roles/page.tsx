"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { EmbedEditor } from "@/components/EmbedEditor";
import { EmbedPreview } from "@/components/EmbedPreview";
import { HowItWorks } from "@/components/HowItWorks";
import { ConfirmModal } from "@/components/confirmModal";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { useToast } from "@/components/toast";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type {
  Channel,
  EmbedConfig,
  ReactionRole,
  ReactionRoleEntry,
  Role,
} from "@/lib/api";
import {
  deleteReactionRole,
  getChannels,
  getReactionRoles,
  getRoles,
  publishReactionRole,
} from "@/lib/api";
import { hexToNumber, isEmbedEmpty } from "@/lib/embed";

type FormState = {
  channelId: string;
  embed: EmbedConfig;
  entries: ReactionRoleEntry[];
};

const EMPTY_FORM: FormState = {
  channelId: "",
  embed: { color: 0xd4a843 },
  entries: [{ emoji: "", roleId: "" }],
};

export default function ReactionRolesPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [list, setList] = useState<ReactionRole[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { loading } = useGuildLoad(
    guildId,
    (id) => Promise.all([getReactionRoles(id), getChannels(id), getRoles(id)]),
    ([rr, ch, r]) => {
      setList(rr);
      setChannels(ch);
      setRoles(r);
    },
  );

  function updateEntry(idx: number, field: keyof ReactionRoleEntry, value: string) {
    setForm((f) => ({
      ...f,
      entries: f.entries.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    }));
  }

  function addEntry() {
    setForm((f) => ({ ...f, entries: [...f.entries, { emoji: "", roleId: "" }] }));
  }

  function removeEntry(idx: number) {
    setForm((f) => ({ ...f, entries: f.entries.filter((_, i) => i !== idx) }));
  }

  function startEdit(rr: ReactionRole) {
    setEditingMessageId(rr.messageId);
    setForm({
      channelId: rr.channelId,
      embed: rr.embed ?? {
        title: rr.title ?? "",
        description: rr.content ?? "",
        color: rr.color ? (hexToNumber(rr.color) ?? 0xd4a843) : 0xd4a843,
      },
      entries: rr.entries,
    });
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setForm(EMPTY_FORM);
  }

  const isFormValid =
    form.channelId &&
    !isEmbedEmpty(form.embed) &&
    form.entries.length > 0 &&
    form.entries.every((e) => e.emoji.trim() && e.roleId);

  async function handlePublish() {
    if (!isFormValid) return;
    setPublishing(true);
    try {
      if (editingMessageId) {
        await deleteReactionRole(guildId, editingMessageId);
      }
      await publishReactionRole(guildId, {
        channelId: form.channelId,
        embed: form.embed,
        entries: form.entries.filter((e) => e.emoji.trim() && e.roleId),
      });
      const updated = await getReactionRoles(guildId);
      setList(updated);
      setForm(EMPTY_FORM);
      setEditingMessageId(null);
    } catch {
      toast("Nie udało się opublikować.", "error");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(messageId: string) {
    setPendingDelete(null);
    try {
      await deleteReactionRole(guildId, messageId);
      setList((l) => l.filter((r) => r.messageId !== messageId));
      if (editingMessageId === messageId) cancelEdit();
      toast("Wiadomość usunięta.", "success");
    } catch {
      toast("Nie udało się usunąć.", "error");
    }
  }

  function roleName(roleId: string) {
    return roles.find((r) => r.id === roleId)?.name ?? roleId;
  }

  function channelName(chId: string) {
    return channels.find((c) => c.id === chId)?.name ?? chId;
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Assignment Grid"
        title={
          <>
            Reaction <span className="italic text-[#d4a843]">Roles</span>
          </>
        }
        description="Bot publikuje embed z emoji — reakcja nadaje rolę."
      />

      <HowItWorks
        className="mb-8"
        steps={[
          "Zbuduj embed: wybierz kanał, tytuł, treść i kolor (pełny edytor embeda).",
          "Dodaj pary emoji → rola, np. ✅ → Zweryfikowany.",
          "Kliknij Opublikuj — bot wyśle wiadomość i sam doda reakcje.",
          "Klik reakcji nadaje przypisaną rolę, a jej zdjęcie — odbiera.",
        ]}
      />

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Form */}
        <div className="w-full lg:w-96">
          <div className="rounded-xl bg-[#1a1f2e]">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <p className="text-sm font-semibold text-white">
                {editingMessageId ? "Edytuj wiadomość" : "Nowa wiadomość"}
              </p>
              {editingMessageId && (
                <button
                  onClick={cancelEdit}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Anuluj
                </button>
              )}
            </div>

            <div className="flex flex-col gap-4 p-6">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Kanał</label>
                <ChannelSelect
                  value={form.channelId}
                  onChange={(v) => setForm((f) => ({ ...f, channelId: v }))}
                  channels={channels}
                  placeholder="— Wybierz kanał —"
                  className="w-full px-3 py-2.5"
                />
              </div>

              <EmbedEditor
                value={form.embed}
                onChange={(embed) => setForm((f) => ({ ...f, embed }))}
              />

              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Pary emoji → rola
                </label>
                <p className="mb-2 text-xs text-gray-600">
                  Standardowe emoji wpisz wprost (np. ✅). Custom emoji z serwera podaj
                  jako <code className="text-gray-400">&lt;:nazwa:id&gt;</code> — w
                  Discordzie uzyskasz ten zapis wpisując <code className="text-gray-400">\:nazwa:</code>.
                </p>
                <div className="flex flex-col gap-2">
                  {form.entries.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={entry.emoji}
                        onChange={(e) => updateEntry(idx, "emoji", e.target.value)}
                        placeholder="emoji"
                        className="w-16 rounded-lg bg-[#0f1117] px-2 py-2 text-center text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                      />
                      <RoleSelect
                        value={entry.roleId}
                        onChange={(v) => updateEntry(idx, "roleId", v)}
                        roles={roles}
                        placeholder="— Rola —"
                        className="flex-1 px-3 py-2"
                      />
                      {form.entries.length > 1 && (
                        <button
                          onClick={() => removeEntry(idx)}
                          className="text-gray-600 hover:text-red-400"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addEntry}
                  className="mt-2 text-xs text-[#d4a843] hover:text-[#c49b3a]"
                >
                  + Dodaj kolejną parę
                </button>
              </div>

              <div>
                <p className="mb-2 text-xs text-gray-500">Podgląd</p>
                <EmbedPreview embed={form.embed} />
              </div>

              <button
                onClick={handlePublish}
                disabled={publishing || !isFormValid}
                className="mt-2 rounded-lg bg-[#d4a843] py-2.5 text-sm font-semibold text-black transition hover:bg-[#c49b3a] disabled:opacity-40"
              >
                {publishing
                  ? "Publikowanie..."
                  : editingMessageId
                    ? "Zapisz zmiany"
                    : "Opublikuj"}
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="rounded-xl bg-[#1a1f2e]">
            <div className="border-b border-white/5 px-6 py-4">
              <p className="text-sm font-semibold text-white">
                Opublikowane wiadomości
                <span className="ml-2 text-xs text-gray-500">{list.length}</span>
              </p>
            </div>

            {list.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                Brak wiadomości. Opublikuj pierwszą po lewej.
              </div>
            ) : (
              list.map((rr) => (
                <div
                  key={rr.messageId}
                  className={`border-b border-white/5 px-6 py-4 last:border-0 ${editingMessageId === rr.messageId ? "bg-[#d4a843]/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {rr.color && (
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: rr.color }}
                          />
                        )}
                        <p className="text-xs text-gray-500">
                          # {channelName(rr.channelId)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-white">{rr.title}</p>
                      <p className="truncate text-xs text-gray-400">{rr.content}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rr.entries.map((e, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1.5 rounded-full bg-[#0f1117] px-2.5 py-1 text-xs text-gray-300"
                          >
                            <span>{e.emoji}</span>
                            <span>@{roleName(e.roleId)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => startEdit(rr)}
                        className="rounded-lg bg-[#0f1117] px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => setPendingDelete(rr.messageId)}
                        className="rounded-lg bg-[#0f1117] px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {pendingDelete !== null && (
        <ConfirmModal
          message="Czy na pewno chcesz usunąć tę wiadomość reaction role? Zostanie usunięta także z Discorda."
          onConfirm={() => handleDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
