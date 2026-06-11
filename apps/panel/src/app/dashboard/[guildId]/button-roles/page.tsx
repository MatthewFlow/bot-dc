"use client";

import { MousePointerClick } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { ConfirmModal } from "@/components/confirmModal";
import { EmbedEditor } from "@/components/EmbedEditor";
import { EmbedPreview } from "@/components/EmbedPreview";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { ButtonRole, ButtonRoleEntry, Channel, EmbedConfig, Role } from "@/lib/api";
import {
  deleteButtonRole,
  getButtonRoles,
  getChannels,
  getRoles,
  publishButtonRole,
} from "@/lib/api";
import { isEmbedEmpty } from "@/lib/embed";

type FormState = {
  channelId: string;
  embed: EmbedConfig;
  entries: ButtonRoleEntry[];
};

const EMPTY_FORM: FormState = {
  channelId: "",
  embed: { color: 0xd4a843 },
  entries: [{ label: "", emoji: "", roleId: "" }],
};

const MAX_BUTTONS = 25;

export default function ButtonRolesPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [list, setList] = useState<ButtonRole[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { loading } = useGuildLoad(
    guildId,
    (id) => Promise.all([getButtonRoles(id), getChannels(id), getRoles(id)]),
    ([br, ch, r]) => {
      setList(br);
      setChannels(ch);
      setRoles(r);
    },
  );

  function updateEntry(idx: number, field: keyof ButtonRoleEntry, value: string) {
    setForm((f) => ({
      ...f,
      entries: f.entries.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    }));
  }

  function addEntry() {
    setForm((f) =>
      f.entries.length >= MAX_BUTTONS
        ? f
        : { ...f, entries: [...f.entries, { label: "", emoji: "", roleId: "" }] },
    );
  }

  function removeEntry(idx: number) {
    setForm((f) => ({ ...f, entries: f.entries.filter((_, i) => i !== idx) }));
  }

  function startEdit(br: ButtonRole) {
    setEditingMessageId(br.messageId);
    setForm({
      channelId: br.channelId,
      embed: br.embed ?? { color: 0xd4a843 },
      entries: br.entries.length ? br.entries : EMPTY_FORM.entries,
    });
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setForm(EMPTY_FORM);
  }

  const filledEntries = form.entries.filter((e) => e.label.trim() && e.roleId);
  const uniqueRoles = new Set(filledEntries.map((e) => e.roleId)).size;
  const isFormValid =
    Boolean(form.channelId) &&
    !isEmbedEmpty(form.embed) &&
    filledEntries.length > 0 &&
    uniqueRoles === filledEntries.length;

  async function handlePublish() {
    if (!isFormValid) return;
    setPublishing(true);
    try {
      if (editingMessageId) {
        await deleteButtonRole(guildId, editingMessageId);
      }
      await publishButtonRole(guildId, {
        channelId: form.channelId,
        embed: form.embed,
        entries: filledEntries.map((e) => ({
          label: e.label.trim(),
          emoji: e.emoji?.trim() || undefined,
          roleId: e.roleId,
        })),
      });
      setList(await getButtonRoles(guildId));
      setForm(EMPTY_FORM);
      setEditingMessageId(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się opublikować.", "error");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(messageId: string) {
    setPendingDelete(null);
    try {
      await deleteButtonRole(guildId, messageId);
      setList((l) => l.filter((b) => b.messageId !== messageId));
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
        <p className="text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Assignment Grid"
        icon={MousePointerClick}
        title={
          <>
            Button <span className="italic text-primary">Roles</span>
          </>
        }
        description="Bot publikuje embed z przyciskami — klik nadaje lub zdejmuje rolę."
      />

      <HowItWorks
        className="mb-8"
        steps={[
          "Zbuduj embed: wybierz kanał, tytuł, treść i kolor (pełny edytor embeda).",
          "Dodaj przyciski: etykieta, opcjonalne emoji i rola (do 25 sztuk).",
          "Kliknij Opublikuj — bot wyśle wiadomość z gotowymi przyciskami.",
          "Klik przycisku nadaje rolę, a ponowny klik ją zdejmuje (odpowiedź widzi tylko klikający).",
        ]}
      />

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Form */}
        <div className="w-full lg:w-96">
          <div className="surface-raised rounded-xl bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <p className="text-sm font-semibold text-white">
                {editingMessageId ? "Edytuj wiadomość" : "Nowa wiadomość"}
              </p>
              {editingMessageId && (
                <button
                  onClick={cancelEdit}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  Anuluj
                </button>
              )}
            </div>

            <div className="flex flex-col gap-4 p-6">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Kanał</label>
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
                <label className="mb-1 block text-xs text-gray-400">
                  Przyciski (etykieta · emoji · rola)
                </label>
                <p className="mb-2 text-xs text-gray-400">
                  Emoji jest opcjonalne — standardowe wpisz wprost (np. ✅), custom jako{" "}
                  <code className="text-gray-300">&lt;:nazwa:id&gt;</code>. Każda rola
                  może mieć tylko jeden przycisk.
                </p>
                <div className="flex flex-col gap-2">
                  {form.entries.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={entry.label}
                        onChange={(e) => updateEntry(idx, "label", e.target.value)}
                        placeholder="Etykieta"
                        maxLength={80}
                        className="w-28 rounded-lg bg-background px-2 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        value={entry.emoji ?? ""}
                        onChange={(e) => updateEntry(idx, "emoji", e.target.value)}
                        placeholder="emoji"
                        className="w-14 rounded-lg bg-background px-2 py-2 text-center text-sm text-white outline-none focus:ring-2 focus:ring-primary"
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
                          className="text-gray-400 hover:text-red-400"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {form.entries.length < MAX_BUTTONS && (
                  <button
                    onClick={addEntry}
                    className="mt-2 text-xs text-primary hover:text-primary-hover"
                  >
                    + Dodaj kolejny przycisk
                  </button>
                )}
              </div>

              <Button
                onClick={handlePublish}
                disabled={publishing || !isFormValid}
                className="mt-2"
              >
                {publishing
                  ? "Publikowanie..."
                  : editingMessageId
                    ? "Zapisz zmiany"
                    : "Opublikuj"}
              </Button>
            </div>
          </div>
        </div>

        {/* Preview + List */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Podgląd — obok edytora, nad listą opublikowanych wiadomości */}
          <div className="surface-raised rounded-xl bg-card">
            <div className="border-b border-border px-6 py-4">
              <p className="text-sm font-semibold text-white">Podgląd</p>
            </div>
            <div className="p-6">
              <EmbedPreview embed={form.embed} />
            </div>
          </div>

          <div className="surface-raised rounded-xl bg-card">
            <div className="border-b border-border px-6 py-4">
              <p className="text-sm font-semibold text-white">
                Opublikowane wiadomości
                <span className="ml-2 text-xs text-gray-400">{list.length}</span>
              </p>
            </div>

            {list.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">
                Brak wiadomości. Opublikuj pierwszą po lewej.
              </div>
            ) : (
              list.map((br) => (
                <div
                  key={br.messageId}
                  className={`border-b border-border px-6 py-4 last:border-0 ${editingMessageId === br.messageId ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {typeof br.embed?.color === "number" && (
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: `#${br.embed.color.toString(16).padStart(6, "0")}`,
                            }}
                          />
                        )}
                        <p className="text-xs text-gray-400">
                          # {channelName(br.channelId)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {br.embed?.title || "(bez tytułu)"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {br.entries.map((e, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs text-gray-300"
                          >
                            {e.emoji && <span>{e.emoji}</span>}
                            <span>{e.label}</span>
                            <span className="text-gray-500">→ @{roleName(e.roleId)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => startEdit(br)}
                        className="rounded-lg bg-background px-3 py-1.5 text-xs text-gray-300 hover:text-white"
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => setPendingDelete(br.messageId)}
                        className="rounded-lg bg-background px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10"
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
          message="Czy na pewno chcesz usunąć tę wiadomość button role? Zostanie usunięta także z Discorda."
          onConfirm={() => handleDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
