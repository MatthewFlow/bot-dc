"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmModal } from "@/components/confirmModal";
import { useToast } from "@/components/toast";
import type { Channel, ReactionRole, ReactionRoleEntry, Role } from "@/lib/api";
import {
  deleteReactionRole,
  getChannels,
  getReactionRoles,
  getRoles,
  publishReactionRole,
} from "@/lib/api";

const PRESET_COLORS = [
  { label: "Złoty", value: "#d4a843" },
  { label: "Niebieski", value: "#5865F2" },
  { label: "Zielony", value: "#57F287" },
  { label: "Czerwony", value: "#ED4245" },
  { label: "Szary", value: "#4f545c" },
];

type FormState = {
  channelId: string;
  title: string;
  content: string;
  color: string;
  entries: ReactionRoleEntry[];
};

const EMPTY_FORM: FormState = {
  channelId: "",
  title: "",
  content: "",
  color: "#d4a843",
  entries: [{ emoji: "", roleId: "" }],
};

export default function ReactionRolesPage() {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [list, setList] = useState<ReactionRole[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("jh_token");
    if (!token) {
      router.replace("/");
      return;
    }

    Promise.all([
      getReactionRoles(token, guildId),
      getChannels(token, guildId),
      getRoles(token, guildId),
    ])
      .then(([rr, ch, r]) => {
        setList(rr);
        setChannels(ch);
        setRoles(r);
      })
      .catch(() => router.replace("/dashboard"))
      .finally(() => setLoading(false));
  }, [guildId, router]);

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
      title: rr.title ?? "",
      content: rr.content ?? "",
      color: rr.color ?? "#d4a843",
      entries: rr.entries,
    });
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setForm(EMPTY_FORM);
  }

  const isFormValid =
    form.channelId &&
    form.title.trim() &&
    form.content.trim() &&
    form.entries.length > 0 &&
    form.entries.every((e) => e.emoji.trim() && e.roleId);

  async function handlePublish() {
    const token = localStorage.getItem("jh_token");
    if (!token || !isFormValid) return;

    setPublishing(true);
    try {
      if (editingMessageId) {
        await deleteReactionRole(token, guildId, editingMessageId);
      }

      await publishReactionRole(token, guildId, {
        ...form,
        entries: form.entries.filter((e) => e.emoji.trim() && e.roleId),
      });

      const updated = await getReactionRoles(token, guildId);
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
    const token = localStorage.getItem("jh_token");
    if (!token) return;

    setPendingDelete(null);
    try {
      await deleteReactionRole(token, guildId, messageId);
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
    <div className="flex flex-col p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          Assignment Grid
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Reaction <span className="italic text-[#d4a843]">Roles</span>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Bot publikuje embed z emoji — reakcja nadaje rolę.
        </p>
      </div>

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
              {/* Channel */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">Kanał</label>
                <select
                  value={form.channelId}
                  onChange={(e) => setForm((f) => ({ ...f, channelId: e.target.value }))}
                  className="w-full rounded-lg bg-[#0f1117] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                >
                  <option value="">— Wybierz kanał —</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      # {ch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">Tytuł embeda</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="np. Weryfikacja"
                  className="w-full rounded-lg bg-[#0f1117] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                />
              </div>

              {/* Content */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">Treść</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={3}
                  placeholder="np. Zareaguj emoji aby otrzymać rolę!"
                  className="w-full resize-none rounded-lg bg-[#0f1117] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                />
              </div>

              {/* Color */}
              <div>
                <label className="mb-2 block text-xs text-gray-500">Kolor embeda</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                      title={c.label}
                      className={`h-7 w-7 rounded-full transition ${form.color === c.value ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1f2e]" : ""}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
                    title="Własny kolor"
                  />
                </div>
              </div>

              {/* Entries */}
              <div>
                <label className="mb-2 block text-xs text-gray-500">
                  Pary emoji → rola
                </label>
                <div className="flex flex-col gap-2">
                  {form.entries.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={entry.emoji}
                        onChange={(e) => updateEntry(idx, "emoji", e.target.value)}
                        placeholder="emoji"
                        className="w-16 rounded-lg bg-[#0f1117] px-2 py-2 text-center text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                      />
                      <select
                        value={entry.roleId}
                        onChange={(e) => updateEntry(idx, "roleId", e.target.value)}
                        className="flex-1 rounded-lg bg-[#0f1117] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                      >
                        <option value="">— Rola —</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
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

              {/* Preview */}
              <div className="rounded-lg bg-[#0f1117] p-3">
                <p className="mb-2 text-xs text-gray-500">Podgląd</p>
                <div
                  className="rounded border-l-4 bg-[#1a1f2e] p-3"
                  style={{ borderColor: form.color }}
                >
                  <p className="text-sm font-semibold text-white">
                    {form.title || "Tytuł embeda"}
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    {form.content || "Treść wiadomości..."}
                  </p>
                </div>
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
        <div className="flex-1">
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
