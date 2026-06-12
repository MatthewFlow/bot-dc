"use client";

import { Ticket as TicketIcon, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { type CSSProperties, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { TicketStatusBadge } from "@/components/badges";
import { ChannelField } from "@/components/ChannelField";
import { ConfirmModal } from "@/components/confirmModal";
import { CreateRoleButton } from "@/components/CreateRoleButton";
import { EmbedEditor } from "@/components/EmbedEditor";
import { EmbedPreviewCard } from "@/components/EmbedPreviewCard";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { PanelCard } from "@/components/PanelCard";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { PageSkeleton, Skeleton, SkeletonRow } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { VariablesList } from "@/components/VariablesList";
import { useChannels, useGuildConfig, useRoles, useTickets } from "@/hooks/queries";
import { useRedirectOnError, useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { Channel, GuildConfig, Role, TicketStatus } from "@/lib/api";
import {
  closeTicket,
  deleteTicket,
  reopenTicket,
  sendTicketPanel,
  updateGuildConfig,
} from "@/lib/api";
import { previewReplacer, TICKET_VARS, VARIABLE_INFO } from "@/lib/embed";
import { waitingSince } from "@/lib/time";

const DEFAULT_TICKET_PANEL_EMBED = {
  title: "📩 Złóż ticket",
  description:
    "Naciśnij przycisk poniżej, opisz swój problem, a Twoje zgłoszenie trafi do ekipy. " +
    "Po przejęciu przez moderatora lub admina otrzymasz pomoc w prywatnym wątku.",
  color: 0x5865f2,
};

type StatusFilter = "all" | TicketStatus;

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Wszystkie",
  pending: "Oczekujące",
  open: "W trakcie",
  closed: "Zamknięte",
};

function TicketsSkeleton() {
  return (
    <PageSkeleton>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="surface-raised rounded-xl bg-card">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-b border-border last:border-0">
            <SkeletonRow />
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}

/** Pokazuje nazwę użytkownika (z Discorda); gdy brak — fallback na ID w monospace. */
function UserName({ name, id }: { name?: string | null; id?: string }) {
  if (name) return <span className="font-medium text-gray-300">{name}</span>;
  return <span className="font-mono text-gray-400">{id ?? "—"}</span>;
}

export default function TicketsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [config, setConfig] = useState<GuildConfig>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [saving, setSaving] = useState(false);

  const [filter, setFilter] = useState<StatusFilter>("all");

  const [panelChannelId, setPanelChannelId] = useState("");
  const [sendingPanel, setSendingPanel] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const configQ = useGuildConfig(guildId);
  const rolesQ = useRoles(guildId);
  const channelsQ = useChannels(guildId);
  // Zawsze pobieramy WSZYSTKIE tickety — liczniki liczone z pełnego zbioru,
  // filtrowanie zakładką odbywa się po stronie klienta (poniżej).
  const ticketsQ = useTickets(guildId);
  const tickets = ticketsQ.data ?? [];
  const ticketsLoading = ticketsQ.isLoading;
  const loading = configQ.isLoading || rolesQ.isLoading || channelsQ.isLoading;
  useRedirectOnError(configQ.isError, configQ.error);
  const configReady = useSeedOnce(configQ.data, setConfig);
  useSeedOnce(rolesQ.data, setRoles);
  useSeedOnce(channelsQ.data, setChannels);

  async function handleSave() {
    setSaving(true);
    try {
      await updateGuildConfig(guildId, {
        ticketSupportRoleId: config.ticketSupportRoleId,
        ticketSupportRoleId2: config.ticketSupportRoleId2,
        ticketLogChannelId: config.ticketLogChannelId,
        ticketPanelEmbed: config.ticketPanelEmbed,
        ticketPanelButton: config.ticketPanelButton,
      });
      toast("Zapisano zmiany.", "success");
    } catch {
      toast("Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseTicket(threadId: string) {
    setActionBusy(threadId);
    try {
      await closeTicket(guildId, threadId);
      toast("Ticket zamknięty.", "success");
      await ticketsQ.refetch();
    } catch {
      toast("Nie udało się zamknąć ticketu.", "error");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleReopenTicket(threadId: string) {
    setActionBusy(threadId);
    try {
      await reopenTicket(guildId, threadId);
      toast("Ticket otwarty ponownie.", "success");
      await ticketsQ.refetch();
    } catch {
      toast("Nie udało się otworzyć ticketu (wątek mógł zostać usunięty).", "error");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleDeleteTicket(threadId: string) {
    setConfirmDelete(null);
    setActionBusy(threadId);
    try {
      await deleteTicket(guildId, threadId);
      toast("Ticket usunięty.", "success");
      await ticketsQ.refetch();
    } catch {
      toast("Nie udało się usunąć ticketu.", "error");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleSendPanel() {
    if (!panelChannelId) return;
    setSendingPanel(true);
    try {
      await sendTicketPanel(guildId, panelChannelId);
      toast("Panel ticketów wysłany na kanał ✅", "success");
    } catch {
      toast("Nie udało się wysłać panelu. Sprawdź uprawnienia bota.", "error");
    } finally {
      setSendingPanel(false);
    }
  }

  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const openCount = tickets.filter((t) => t.status === "open").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;

  const visibleTickets =
    filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify({
      ticketSupportRoleId: config.ticketSupportRoleId,
      ticketSupportRoleId2: config.ticketSupportRoleId2,
      ticketLogChannelId: config.ticketLogChannelId,
      ticketPanelEmbed: config.ticketPanelEmbed,
      ticketPanelButton: config.ticketPanelButton,
    }),
    handleSave,
    configReady,
  );

  if (loading) return <TicketsSkeleton />;

  return (
    <div className="jh-in flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Support System"
        icon={TicketIcon}
        title={
          <>
            System <span className="italic text-primary">ticketów</span>
          </>
        }
        description="Prywatne wątki Discord do obsługi zgłoszeń użytkowników."
        className="mb-0"
      />

      <HowItWorks
        steps={[
          "Ustaw rolę obsługi i wyślij panel na kanał (lub użyj /ticket_setup).",
          "Użytkownik klika „Złóż ticket” i opisuje sprawę — powstaje prywatny wątek.",
          "Ekipa dostaje ping i przejmuje zgłoszenie przyciskiem „Przejmij”.",
          "Po rozwiązaniu /ticket_close zamyka wątek; tu masz podgląd i historię.",
        ]}
      />

      {!config.ticketSupportRoleId && !config.ticketSupportRoleId2 && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-200">
          <span className="text-lg leading-none">⚠️</span>
          <p>
            Nie ustawiono <strong>roli obsługi</strong> — przy nowym zgłoszeniu nikt nie
            zostanie powiadomiony ani nie będzie mógł go przejąć. Uzupełnij konfigurację
            poniżej i zapisz.
          </p>
        </div>
      )}

      {/* Wygląd panelu ticketów — edytor i podgląd po 50% w jednej linii */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {/* Edytor */}
        <PanelCard
          title="Panel ticketów"
          description="Zbuduj embed i przycisk, a potem opublikuj na kanał."
        >
          <ChannelField
            label="Kanał publikacji"
            value={panelChannelId}
            onChange={setPanelChannelId}
            channels={channels}
            onChannelsChange={setChannels}
            guildId={guildId}
            defaultName="tickety"
          />
          <EmbedEditor
            value={config.ticketPanelEmbed ?? DEFAULT_TICKET_PANEL_EMBED}
            onChange={(embed) => setConfig((c) => ({ ...c, ticketPanelEmbed: embed }))}
            variables={TICKET_VARS}
          />
          <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-border pt-4">
            <div>
              <label
                className="mb-1 block text-xs text-gray-400"
                htmlFor="ticketBtnLabel"
              >
                Etykieta przycisku
              </label>
              <input
                id="ticketBtnLabel"
                name="ticketBtnLabel"
                value={config.ticketPanelButton?.label ?? ""}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    ticketPanelButton: {
                      ...c.ticketPanelButton,
                      label: e.target.value,
                    },
                  }))
                }
                maxLength={80}
                placeholder="Złóż ticket"
                className="w-full rounded-lg bg-background px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-xs text-gray-400"
                htmlFor="ticketBtnEmoji"
              >
                Emoji
              </label>
              <input
                id="ticketBtnEmoji"
                name="ticketBtnEmoji"
                value={config.ticketPanelButton?.emoji ?? ""}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    ticketPanelButton: {
                      ...c.ticketPanelButton,
                      emoji: e.target.value,
                    },
                  }))
                }
                maxLength={8}
                placeholder="📩"
                className="w-16 rounded-lg bg-background px-3 py-2 text-center text-sm text-white outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Publikacja na wybrany wyżej kanał */}
          <div className="border-t border-border pt-4">
            <Button
              onClick={handleSendPanel}
              disabled={!panelChannelId || sendingPanel}
              className="w-full"
            >
              {sendingPanel ? "Publikowanie…" : "Opublikuj"}
            </Button>
          </div>
        </PanelCard>

        {/* Podgląd */}
        <EmbedPreviewCard
          embed={config.ticketPanelEmbed ?? DEFAULT_TICKET_PANEL_EMBED}
          replace={previewReplacer}
          buttonLabel={config.ticketPanelButton?.label || "Złóż ticket"}
          buttonEmoji={config.ticketPanelButton?.emoji || "📩"}
          className="lg:sticky lg:top-20"
        >
          {/* Dostępne zmienne — panel jest statyczny, więc tylko kontekst serwera */}
          <VariablesList
            className="mt-4"
            items={TICKET_VARS.map((v) => ({ label: v, desc: VARIABLE_INFO[v] ?? "" }))}
          />
        </EmbedPreviewCard>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Config */}
        <div className="flex flex-col gap-4 lg:w-80">
          <div className="surface-raised rounded-xl bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <p className="text-sm font-semibold text-white">Konfiguracja</p>
              <SaveButton
                onClick={handleSave}
                saving={saving}
                autoSaveStatus={autoSaveStatus}
                className="px-4 py-1.5 text-xs"
              />
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div>
                <label className="mb-1 block text-xs text-gray-400">
                  Rola obsługi #1
                </label>
                <RoleSelect
                  value={config.ticketSupportRoleId ?? ""}
                  onChange={(v) => setConfig((c) => ({ ...c, ticketSupportRoleId: v }))}
                  roles={roles}
                  className="w-full px-3 py-2.5"
                />
                <div className="mt-2">
                  <CreateRoleButton
                    guildId={guildId}
                    defaultName="Support"
                    onCreated={(role) => {
                      setRoles((prev) =>
                        [...prev, role].sort((a, b) => b.position - a.position),
                      );
                      setConfig((c) => ({ ...c, ticketSupportRoleId: role.id }));
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">
                  Rola obsługi #2
                </label>
                <RoleSelect
                  value={config.ticketSupportRoleId2 ?? ""}
                  onChange={(v) => setConfig((c) => ({ ...c, ticketSupportRoleId2: v }))}
                  roles={roles}
                  className="w-full px-3 py-2.5"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Obie role są pingowane przy nowym zgłoszeniu i mogą je przejmować (obok
                  admina).
                </p>
              </div>

              <ChannelField
                label="Kanał logów ticketów"
                value={config.ticketLogChannelId ?? ""}
                onChange={(v) => setConfig((c) => ({ ...c, ticketLogChannelId: v }))}
                channels={channels}
                onChannelsChange={setChannels}
                guildId={guildId}
                defaultName="ticket-logi"
                hint="Tu trafiają logi otwarcia i zamknięcia ticketów."
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="surface-raised rounded-xl bg-card p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
              <p className="text-xs text-gray-400">Oczekuje</p>
            </div>
            <div className="surface-raised rounded-xl bg-card p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{openCount}</p>
              <p className="text-xs text-gray-400">W trakcie</p>
            </div>
            <div className="surface-raised rounded-xl bg-card p-4 text-center">
              <p className="text-2xl font-bold text-gray-300">{closedCount}</p>
              <p className="text-xs text-gray-400">Zamknięte</p>
            </div>
          </div>
        </div>

        {/* Tickets list */}
        <div className="flex-1">
          <div className="surface-raised rounded-xl bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <p className="text-sm font-semibold text-white">
                Tickety
                <span className="ml-2 text-xs text-gray-400">
                  {visibleTickets.length}
                </span>
              </p>
              <div className="flex gap-1">
                {(["all", "pending", "open", "closed"] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`rounded-lg px-3 py-1 text-xs transition ${
                      filter === s
                        ? "bg-primary/20 text-primary"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    {FILTER_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {ticketsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-b border-border last:border-0">
                  <SkeletonRow />
                </div>
              ))
            ) : visibleTickets.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">
                Brak ticketów
                {filter !== "all" ? ` (${FILTER_LABELS[filter].toLowerCase()})` : ""}.
              </div>
            ) : (
              visibleTickets.map((ticket, i) => (
                <div
                  key={ticket.id}
                  style={{ "--i": i } as CSSProperties}
                  className="jh-stagger flex flex-col gap-3 border-b border-border px-6 py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    {/* Nagłówek: status + autor */}
                    <div className="flex flex-wrap items-center gap-2">
                      <TicketStatusBadge status={ticket.status} />
                      <Avatar
                        src={ticket.avatar}
                        name={ticket.username ?? ticket.userId}
                      />
                      <span className="text-sm">
                        <UserName name={ticket.username} id={ticket.userId} />
                      </span>
                    </div>

                    {/* Temat zgłoszenia */}
                    {ticket.subject && (
                      <p className="mt-2 truncate text-sm text-white">{ticket.subject}</p>
                    )}

                    {/* Meta: przejęcie + link do wątku */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                      {ticket.assignedTo ? (
                        <span>
                          Przejął:{" "}
                          <UserName
                            name={ticket.assignedToUsername}
                            id={ticket.assignedTo}
                          />
                        </span>
                      ) : ticket.status === "pending" ? (
                        <span className="text-yellow-500/80">
                          czeka na przejęcie · {waitingSince(ticket.createdAt)}
                        </span>
                      ) : null}
                      <a
                        href={`https://discord.com/channels/${guildId}/${ticket.threadId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-discord hover:underline"
                      >
                        Otwórz wątek ↗
                      </a>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <div className="text-xs text-gray-400 sm:text-right">
                      {new Date(ticket.createdAt).toLocaleString("pl-PL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      {ticket.status === "closed" ? (
                        <button
                          onClick={() => handleReopenTicket(ticket.threadId)}
                          disabled={actionBusy === ticket.threadId}
                          className="rounded-lg bg-background px-3 py-1 text-xs text-green-400 transition hover:bg-green-500/10 disabled:opacity-40"
                        >
                          {actionBusy === ticket.threadId ? "…" : "Otwórz ponownie"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCloseTicket(ticket.threadId)}
                          disabled={actionBusy === ticket.threadId}
                          className="rounded-lg bg-background px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
                        >
                          {actionBusy === ticket.threadId ? "…" : "Zamknij"}
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(ticket.threadId)}
                        disabled={actionBusy === ticket.threadId}
                        title="Usuń ticket z bazy (i wątek na Discordzie)"
                        className="rounded-lg bg-background p-1.5 text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-90 disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          message="Na pewno usunąć ten ticket? Wątek na Discordzie i wpis w bazie zostaną trwale usunięte."
          onConfirm={() => handleDeleteTicket(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
