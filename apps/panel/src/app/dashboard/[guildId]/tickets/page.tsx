"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { ChannelSelect } from "@/components/ChannelSelect";
import { CreateChannelButton } from "@/components/CreateChannelButton";
import { CreateRoleButton } from "@/components/CreateRoleButton";
import { EmbedEditor } from "@/components/EmbedEditor";
import { EmbedPreview } from "@/components/EmbedPreview";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { Channel, GuildConfig, Role, Ticket, TicketStatus } from "@/lib/api";
import {
  closeTicket,
  getChannels,
  getGuildConfig,
  getRoles,
  getTickets,
  reopenTicket,
  sendTicketPanel,
  updateGuildConfig,
} from "@/lib/api";
import { previewReplacer, TICKET_VARS, VARIABLE_INFO } from "@/lib/embed";

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
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div>
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="rounded-xl bg-[#1a1f2e]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-b border-white/5 last:border-0">
            <SkeletonRow />
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<TicketStatus, { label: string; cls: string }> = {
  pending: { label: "Oczekuje", cls: "bg-yellow-500/15 text-yellow-400" },
  open: { label: "W trakcie", cls: "bg-green-500/15 text-green-400" },
  closed: { label: "Zamknięty", cls: "bg-gray-500/15 text-gray-400" },
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const b = STATUS_BADGE[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.cls}`}>
      {b.label}
    </span>
  );
}

/** Pokazuje nazwę użytkownika (z Discorda); gdy brak — fallback na ID w monospace. */
function UserName({ name, id }: { name?: string | null; id?: string }) {
  if (name) return <span className="font-medium text-gray-300">{name}</span>;
  return <span className="font-mono text-gray-500">{id ?? "—"}</span>;
}

/** Zwraca zwięzły czas oczekiwania od podanej daty, np. „2h 15min", „3 dni". */
function waitingSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "przed chwilą";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "przed chwilą";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}min`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 dzień" : `${d} dni`;
}

export default function TicketsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [config, setConfig] = useState<GuildConfig>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [saving, setSaving] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const [panelChannelId, setPanelChannelId] = useState("");
  const [sendingPanel, setSendingPanel] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const { loading } = useGuildLoad(
    guildId,
    (id) => Promise.all([getGuildConfig(id), getRoles(id), getChannels(id)]),
    ([cfg, r, ch]) => {
      setConfig(cfg);
      setRoles(r);
      setChannels(ch);
    },
  );

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  async function fetchTickets() {
    setTicketsLoading(true);
    try {
      // Zawsze pobieramy WSZYSTKIE tickety — liczniki liczone z pełnego zbioru,
      // filtrowanie zakładką odbywa się po stronie klienta (poniżej).
      setTickets(await getTickets(guildId));
    } catch {
      // non-blocking
    } finally {
      setTicketsLoading(false);
    }
  }

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
      await fetchTickets();
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
      await fetchTickets();
    } catch {
      toast("Nie udało się otworzyć ticketu (wątek mógł zostać usunięty).", "error");
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
    !loading,
  );

  if (loading) return <TicketsSkeleton />;

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Support System"
        title={
          <>
            System <span className="italic text-[#d4a843]">ticketów</span>
          </>
        }
        description="Prywatne wątki Discord do obsługi zgłoszeń użytkowników."
        className="mb-0"
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

      {/* Wygląd panelu ticketów — edytor embeda + live podgląd */}
      <div className="rounded-xl bg-[#1a1f2e]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Wygląd panelu ticketów</p>
            <p className="text-xs text-gray-600">
              Embed i przycisk wysyłane przez „Wyślij panel" oraz /ticket_setup.
            </p>
          </div>
          <SaveButton
            onClick={handleSave}
            saving={saving}
            autoSaveStatus={autoSaveStatus}
            className="px-4 py-1.5 text-xs"
          />
        </div>
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          <div>
            <EmbedEditor
              value={config.ticketPanelEmbed ?? DEFAULT_TICKET_PANEL_EMBED}
              onChange={(embed) => setConfig((c) => ({ ...c, ticketPanelEmbed: embed }))}
              variables={TICKET_VARS}
            />
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-3 border-t border-white/5 pt-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Etykieta przycisku
                </label>
                <input
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
                  className="w-full rounded-lg bg-[#0f1117] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Emoji</label>
                <input
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
                  className="w-16 rounded-lg bg-[#0f1117] px-3 py-2 text-center text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                />
              </div>
            </div>
          </div>
          <div className="lg:sticky lg:top-20 lg:self-start">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Podgląd
            </p>
            <EmbedPreview
              embed={config.ticketPanelEmbed ?? DEFAULT_TICKET_PANEL_EMBED}
              replace={previewReplacer}
              buttonLabel={config.ticketPanelButton?.label || "Złóż ticket"}
              buttonEmoji={config.ticketPanelButton?.emoji || "📩"}
            />

            {/* Dostępne zmienne — panel jest statyczny, więc tylko kontekst serwera */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Dostępne zmienne
              </p>
              <div className="flex flex-col gap-2">
                {TICKET_VARS.map((v) => (
                  <div key={v} className="flex items-center gap-3">
                    <span className="w-32 font-mono text-xs text-[#d4a843]">{v}</span>
                    <span className="text-xs text-gray-400">{VARIABLE_INFO[v]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Config */}
        <div className="flex flex-col gap-4 lg:w-80">
          <div className="rounded-xl bg-[#1a1f2e]">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
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
                <label className="mb-1 block text-xs text-gray-500">
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
                <label className="mb-1 block text-xs text-gray-500">
                  Rola obsługi #2
                </label>
                <RoleSelect
                  value={config.ticketSupportRoleId2 ?? ""}
                  onChange={(v) => setConfig((c) => ({ ...c, ticketSupportRoleId2: v }))}
                  roles={roles}
                  className="w-full px-3 py-2.5"
                />
                <p className="mt-1 text-xs text-gray-600">
                  Obie role są pingowane przy nowym zgłoszeniu i mogą je przejmować (obok
                  admina).
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Kanał logów ticketów
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <ChannelSelect
                    value={config.ticketLogChannelId ?? ""}
                    onChange={(v) => setConfig((c) => ({ ...c, ticketLogChannelId: v }))}
                    channels={channels}
                    placeholder="— Wybierz kanał —"
                    className="min-w-0 flex-1 px-3 py-2.5"
                  />
                  <CreateChannelButton
                    guildId={guildId}
                    defaultName="ticket-logi"
                    onCreated={(ch) => {
                      setChannels((prev) =>
                        [...prev, ch].sort((a, b) => a.name.localeCompare(b.name)),
                      );
                      setConfig((c) => ({ ...c, ticketLogChannelId: ch.id }));
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  Tu trafiają logi otwarcia i zamknięcia ticketów.
                </p>
              </div>
            </div>
          </div>

          {/* Wyślij panel ticketów na kanał */}
          <div className="rounded-xl bg-[#1a1f2e] p-6">
            <p className="mb-1 text-sm font-semibold text-white">Panel na kanale</p>
            <p className="mb-3 text-xs text-gray-600">
              Wyślij embed z przyciskiem „Złóż ticket" na wybrany kanał — bez komendy
              /ticket_setup.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ChannelSelect
                value={panelChannelId}
                onChange={setPanelChannelId}
                channels={channels}
                placeholder="— Wybierz kanał —"
                className="min-w-0 flex-1 px-3 py-2.5"
              />
              <button
                onClick={handleSendPanel}
                disabled={!panelChannelId || sendingPanel}
                className="shrink-0 rounded-lg bg-[#d4a843] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#c49b3a] disabled:opacity-40"
              >
                {sendingPanel ? "Wysyłanie…" : "Wyślij panel"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#1a1f2e] p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
              <p className="text-xs text-gray-500">Oczekuje</p>
            </div>
            <div className="rounded-xl bg-[#1a1f2e] p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{openCount}</p>
              <p className="text-xs text-gray-500">W trakcie</p>
            </div>
            <div className="rounded-xl bg-[#1a1f2e] p-4 text-center">
              <p className="text-2xl font-bold text-gray-400">{closedCount}</p>
              <p className="text-xs text-gray-500">Zamknięte</p>
            </div>
          </div>

          <HowItWorks
            steps={[
              "Ustaw rolę supportu i użyj /ticket_setup na wybranym kanale",
              "User klika przycisk Złóż ticket, opisuje problem w formularzu i wysyła",
              "Zgłoszenie trafia do oczekujących — ekipa dostaje ping z przyciskiem Przejmij",
              "Moderator lub admin przejmuje zgłoszenie i pomaga; /ticket_close kończy sprawę",
            ]}
          />
        </div>

        {/* Tickets list */}
        <div className="flex-1">
          <div className="rounded-xl bg-[#1a1f2e]">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <p className="text-sm font-semibold text-white">
                Tickety
                <span className="ml-2 text-xs text-gray-500">
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
                        ? "bg-[#d4a843]/20 text-[#d4a843]"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {FILTER_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {ticketsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-b border-white/5 last:border-0">
                  <SkeletonRow />
                </div>
              ))
            ) : visibleTickets.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                Brak ticketów
                {filter !== "all" ? ` (${FILTER_LABELS[filter].toLowerCase()})` : ""}.
              </div>
            ) : (
              visibleTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex flex-col gap-3 border-b border-white/5 px-6 py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    {/* Nagłówek: status + autor */}
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={ticket.status} />
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
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
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
                        className="text-[#5865f2] hover:underline"
                      >
                        Otwórz wątek ↗
                      </a>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <div className="text-xs text-gray-600 sm:text-right">
                      {new Date(ticket.createdAt).toLocaleString("pl-PL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {ticket.status === "closed" ? (
                      <button
                        onClick={() => handleReopenTicket(ticket.threadId)}
                        disabled={actionBusy === ticket.threadId}
                        className="rounded-lg bg-[#0f1117] px-3 py-1 text-xs text-green-400 transition hover:bg-green-500/10 disabled:opacity-40"
                      >
                        {actionBusy === ticket.threadId ? "…" : "Otwórz ponownie"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCloseTicket(ticket.threadId)}
                        disabled={actionBusy === ticket.threadId}
                        className="rounded-lg bg-[#0f1117] px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
                      >
                        {actionBusy === ticket.threadId ? "…" : "Zamknij"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
