"use client";

import { MousePointerClick, SmilePlus } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { type CSSProperties, useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EmbedPreviewCard } from "@/components/EmbedPreviewCard";
import { PageHeader } from "@/components/PageHeader";
import { PanelCard } from "@/components/PanelCard";
import { RoleSelect } from "@/components/RoleSelect";
import { SelfRolesGuide } from "@/components/SelfRolesGuide";
import { Skeleton, SkeletonForm, SkeletonTable } from "@/components/Skeleton";
import { TipsCard } from "@/components/TipsCard";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import {
  useBotStatus,
  useButtonRoles,
  useChannels,
  useReactionRoles,
  useRoles,
} from "@/hooks/queries";
import { useRedirectOnError, useSeedOnce } from "@/hooks/queryDraft";
import type { ButtonRole, Channel, EmbedConfig, ReactionRole, Role } from "@/lib/api";
import {
  deleteButtonRole,
  deleteReactionRole,
  publishButtonRole,
  publishReactionRole,
} from "@/lib/api";
import { hexToNumber, isEmbedEmpty } from "@/lib/embed";

// Ciężki edytor embeda schodzi z initial bundle — montuje się dopiero po załadowaniu.
const EmbedEditor = dynamic(
  () => import("@/components/EmbedEditor").then((m) => m.EmbedEditor),
  { loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

/** Wskazówki dla buildera self-roles (brak zmiennych szablonu — zamiast nich porady). */
const SELF_ROLE_TIPS: React.ReactNode[] = [
  "Przyciski: klik nadaje lub zdejmuje rolę. Reakcje: dodanie emoji nadaje rolę.",
  <>
    Custom emoji z serwera podaj jako <code>{"<:nazwa:id>"}</code>.
  </>,
  "Limit pozycji: 25 przycisków lub 20 reakcji na jedną wiadomość.",
  "Każda rola może mieć tylko jeden przycisk — duplikaty blokują publikację.",
];

type RoleType = "button" | "reaction";

/** Pozycja na wspólnej liście — oznaczona typem, by edytować/usuwać przez właściwe API. */
type SelfRole = ({ kind: "button" } & ButtonRole) | ({ kind: "reaction" } & ReactionRole);

/** Wiersz formularza — `label` używane tylko dla przycisków, `emoji` dla obu. */
type EntryRow = { label: string; emoji: string; roleId: string };

type FormState = {
  type: RoleType;
  channelId: string;
  embed: EmbedConfig;
  entries: EntryRow[];
};

const EMPTY_FORM: FormState = {
  type: "button",
  channelId: "",
  embed: { color: 0xd4a843 },
  entries: [{ label: "", emoji: "", roleId: "" }],
};

function colorHex(item: SelfRole): string | undefined {
  const num = item.embed?.color;
  if (typeof num === "number") return `#${num.toString(16).padStart(6, "0")}`;
  if (item.kind === "reaction" && item.color) return item.color;
  return undefined;
}

function itemTitle(item: SelfRole): string {
  return (
    item.embed?.title || (item.kind === "reaction" ? item.title : "") || "(bez tytułu)"
  );
}

/** Szkielet tylko kart z danymi — nagłówek i „Jak to działa" renderują się od razu. */
function RolesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
      <div className="w-full">
        <SkeletonForm />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-44 w-full rounded-xl" />
        <SkeletonTable rows={3} />
      </div>
    </div>
  );
}

export default function RolesPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [list, setList] = useState<SelfRole[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<{ kind: RoleType; messageId: string } | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<SelfRole | null>(null);

  const buttonRolesQ = useButtonRoles(guildId);
  const reactionRolesQ = useReactionRoles(guildId);
  const channelsQ = useChannels(guildId);
  const rolesQ = useRoles(guildId);
  // Tożsamość bota (avatar + nazwa) do podglądu „jak wystawi to bot serwera".
  const botStatusQ = useBotStatus();
  // Bramka tylko na opublikowane listy (nasza baza); kanały/role dopełnią selekty w tle.
  const loading = buttonRolesQ.isLoading || reactionRolesQ.isLoading;
  useRedirectOnError(buttonRolesQ.isError, buttonRolesQ.error);
  useSeedOnce(channelsQ.data, setChannels);
  useSeedOnce(rolesQ.data, setRoles);
  // Lista łączy oba źródła — seed dopiero, gdy oba są dostępne.
  const bothRoles =
    buttonRolesQ.data && reactionRolesQ.data
      ? { br: buttonRolesQ.data, rr: reactionRolesQ.data }
      : undefined;
  useSeedOnce(bothRoles, ({ br, rr }) =>
    setList([
      ...br.map((b) => ({ kind: "button" as const, ...b })),
      ...rr.map((x) => ({ kind: "reaction" as const, ...x })),
    ]),
  );

  const maxEntries = form.type === "button" ? 25 : 20;

  function updateEntry(idx: number, field: keyof EntryRow, value: string) {
    setForm((f) => ({
      ...f,
      entries: f.entries.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    }));
  }
  function addEntry() {
    setForm((f) =>
      f.entries.length >= maxEntries
        ? f
        : { ...f, entries: [...f.entries, { label: "", emoji: "", roleId: "" }] },
    );
  }
  function removeEntry(idx: number) {
    setForm((f) => ({ ...f, entries: f.entries.filter((_, i) => i !== idx) }));
  }

  function startEdit(item: SelfRole) {
    setEditing({ kind: item.kind, messageId: item.messageId });
    if (item.kind === "button") {
      setForm({
        type: "button",
        channelId: item.channelId,
        embed: item.embed ?? { color: 0xd4a843 },
        entries: item.entries.length
          ? item.entries.map((e) => ({
              label: e.label,
              emoji: e.emoji ?? "",
              roleId: e.roleId,
            }))
          : EMPTY_FORM.entries,
      });
    } else {
      setForm({
        type: "reaction",
        channelId: item.channelId,
        embed: item.embed ?? {
          title: item.title,
          description: item.content,
          color: item.color ? (hexToNumber(item.color) ?? 0xd4a843) : 0xd4a843,
        },
        entries: item.entries.length
          ? item.entries.map((e) => ({ label: "", emoji: e.emoji, roleId: e.roleId }))
          : EMPTY_FORM.entries,
      });
    }
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  // Kompletne wiersze zależnie od typu: przycisk wymaga etykiety, reakcja — emoji.
  const filled = form.entries.filter((e) =>
    form.type === "button" ? e.label.trim() && e.roleId : e.emoji.trim() && e.roleId,
  );
  const uniqueRoles = new Set(filled.map((e) => e.roleId)).size === filled.length;
  const isFormValid =
    Boolean(form.channelId) &&
    !isEmbedEmpty(form.embed) &&
    filled.length > 0 &&
    (form.type === "button" ? uniqueRoles : true);

  async function handlePublish() {
    if (!isFormValid) return;
    setPublishing(true);
    const { type, channelId, embed } = form;
    const prevEditing = editing;
    try {
      if (prevEditing) {
        if (prevEditing.kind === "button")
          await deleteButtonRole(guildId, prevEditing.messageId);
        else await deleteReactionRole(guildId, prevEditing.messageId);
      }
      let created: SelfRole;
      if (type === "button") {
        const entries = filled.map((e) => ({
          label: e.label.trim(),
          emoji: e.emoji.trim() || undefined,
          roleId: e.roleId,
        }));
        created = {
          kind: "button",
          ...(await publishButtonRole(guildId, {
            channelId,
            embed,
            entries,
          })),
        };
      } else {
        const entries = filled.map((e) => ({ emoji: e.emoji.trim(), roleId: e.roleId }));
        created = {
          kind: "reaction",
          ...(await publishReactionRole(guildId, { channelId, embed, entries })),
        };
      }
      setList((l) => [
        created,
        ...l.filter(
          (x) =>
            !(
              prevEditing &&
              x.kind === prevEditing.kind &&
              x.messageId === prevEditing.messageId
            ),
        ),
      ]);
      setForm(EMPTY_FORM);
      setEditing(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się opublikować.", "error");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(item: SelfRole) {
    setPendingDelete(null);
    const prev = list;
    setList((l) =>
      l.filter((x) => !(x.kind === item.kind && x.messageId === item.messageId)),
    );
    if (editing && editing.kind === item.kind && editing.messageId === item.messageId)
      cancelEdit();
    try {
      if (item.kind === "button") await deleteButtonRole(guildId, item.messageId);
      else await deleteReactionRole(guildId, item.messageId);
      toast("Wiadomość usunięta.", "success");
    } catch {
      setList(prev);
      toast("Nie udało się usunąć.", "error");
    }
  }

  const roleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? roleId;
  const channelName = (chId: string) => channels.find((c) => c.id === chId)?.name ?? chId;

  function setType(type: RoleType) {
    setForm((f) => ({ ...f, type }));
  }

  const typeTab = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
      active ? "bg-primary text-black" : "text-gray-300 hover:text-white"
    }`;

  return (
    <div className="jh-in flex flex-col p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Self-Roles"
        icon={MousePointerClick}
        title={
          <>
            Self <span className="italic text-primary">Roles</span>
          </>
        }
        description="Jedna wiadomość, role do samodzielnego wzięcia — przyciskiem lub reakcją."
      />

      <div className="mb-8">
        <SelfRolesGuide />
      </div>

      {loading ? (
        <RolesSkeleton />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
            {/* Form */}
            <PanelCard
              title={editing ? "Edytuj wiadomość" : "Nowa wiadomość"}
              description={
                editing
                  ? "Zmieniasz opublikowaną wiadomość — zapis nadpisze ją na Discordzie"
                  : "Zbuduj embed i dodaj role do wzięcia kliknięciem lub reakcją"
              }
              action={
                editing ? (
                  <button
                    onClick={cancelEdit}
                    className="text-xs text-gray-400 hover:text-gray-300"
                  >
                    Anuluj
                  </button>
                ) : undefined
              }
            >
              {/* Typ */}
              <div className="flex gap-1 rounded-lg bg-background p-1">
                <button
                  onClick={() => setType("button")}
                  className={typeTab(form.type === "button")}
                >
                  <MousePointerClick size={15} />
                  Przyciski
                </button>
                <button
                  onClick={() => setType("reaction")}
                  className={typeTab(form.type === "reaction")}
                >
                  <SmilePlus size={15} />
                  Reakcje
                </button>
              </div>

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
                  {form.type === "button"
                    ? "Przyciski (etykieta · emoji · rola)"
                    : "Pary emoji → rola"}
                </label>
                <p className="mb-2 text-xs text-gray-400">
                  {form.type === "button"
                    ? "Etykieta wymagana, emoji opcjonalne. Każda rola może mieć tylko jeden przycisk."
                    : "Emoji wymagane (np. ✅). Custom emoji z serwera podaj jako <:nazwa:id>."}
                </p>
                <div className="flex flex-col gap-2">
                  {form.entries.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {form.type === "button" && (
                        <input
                          name={`sr-label-${idx}`}
                          aria-label="Etykieta przycisku"
                          value={entry.label}
                          onChange={(e) => updateEntry(idx, "label", e.target.value)}
                          placeholder="Etykieta"
                          maxLength={80}
                          className="w-28 rounded-lg bg-background px-2 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                        />
                      )}
                      <input
                        name={`sr-emoji-${idx}`}
                        aria-label="Emoji"
                        value={entry.emoji}
                        onChange={(e) => updateEntry(idx, "emoji", e.target.value)}
                        placeholder="emoji"
                        className="w-16 rounded-lg bg-background px-2 py-2 text-center text-sm text-white outline-none focus:ring-2 focus:ring-primary"
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
                {form.entries.length < maxEntries && (
                  <button
                    onClick={addEntry}
                    className="mt-2 text-xs text-primary hover:text-primary-hover"
                  >
                    + Dodaj kolejną pozycję
                  </button>
                )}
              </div>

              <Button
                onClick={handlePublish}
                disabled={publishing || !isFormValid}
                className="w-full"
              >
                {publishing ? "Publikowanie..." : editing ? "Zapisz zmiany" : "Opublikuj"}
              </Button>
            </PanelCard>

            {/* Podgląd */}
            <div className="flex flex-col gap-6 lg:sticky lg:top-20">
              <EmbedPreviewCard
                title="Podgląd na żywo"
                description="Tak zobaczą to członkowie"
                embed={form.embed}
                author={{
                  name: botStatusQ.data?.username ?? "Jurassic Haven",
                  avatar: botStatusQ.data?.avatar ?? null,
                }}
              >
                {filled.length > 0 &&
                  (form.type === "button" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {filled.map((e, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-md bg-[#4e5058] px-3 py-1.5 text-sm font-medium text-white"
                        >
                          {e.emoji && <span>{e.emoji}</span>}
                          <span>{e.label || "Przycisk"}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {filled.map((e, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-sm"
                        >
                          {e.emoji || "❔"}
                        </span>
                      ))}
                    </div>
                  ))}
              </EmbedPreviewCard>

              <TipsCard items={SELF_ROLE_TIPS} />
            </div>
          </div>

          {/* Opublikowane wiadomości — pełna szerokość, osobny wiersz pod spodem */}
          <PanelCard
            title={
              <>
                Opublikowane wiadomości
                <span className="ml-2 text-xs text-gray-400">{list.length}</span>
              </>
            }
            bodyClassName=""
          >
            {list.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">
                Brak wiadomości. Opublikuj pierwszą po lewej.
              </div>
            ) : (
              list.map((item, i) => {
                const isEditing =
                  editing?.kind === item.kind && editing?.messageId === item.messageId;
                return (
                  <div
                    key={`${item.kind}-${item.messageId}`}
                    style={{ "--i": i } as CSSProperties}
                    className={`jh-stagger border-b border-border px-6 py-4 last:border-0 ${isEditing ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {colorHex(item) && (
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: colorHex(item) }}
                            />
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              item.kind === "button"
                                ? "bg-primary/15 text-primary"
                                : "bg-discord/20 text-discord"
                            }`}
                          >
                            {item.kind === "button" ? "Przyciski" : "Reakcje"}
                          </span>
                          <p className="text-xs text-gray-400">
                            # {channelName(item.channelId)}
                          </p>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {itemTitle(item)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.kind === "button"
                            ? item.entries.map((e, j) => (
                                <span
                                  key={j}
                                  className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs text-gray-300"
                                >
                                  {e.emoji && <span>{e.emoji}</span>}
                                  <span>{e.label}</span>
                                  <span className="text-gray-500">
                                    → @{roleName(e.roleId)}
                                  </span>
                                </span>
                              ))
                            : item.entries.map((e, j) => (
                                <span
                                  key={j}
                                  className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs text-gray-300"
                                >
                                  <span>{e.emoji}</span>
                                  <span>@{roleName(e.roleId)}</span>
                                </span>
                              ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded-lg bg-background px-3 py-1.5 text-xs text-gray-300 hover:text-white"
                        >
                          Edytuj
                        </button>
                        <button
                          onClick={() => setPendingDelete(item)}
                          className="rounded-lg bg-background px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10"
                        >
                          Usuń
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </PanelCard>
        </div>
      )}

      {pendingDelete !== null && (
        <ConfirmModal
          message="Czy na pewno chcesz usunąć tę wiadomość? Zostanie usunięta także z Discorda."
          onConfirm={() => handleDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
