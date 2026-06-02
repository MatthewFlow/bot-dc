"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { CreateChannelButton } from "@/components/CreateChannelButton";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
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

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Config */}
        <div className="flex flex-col gap-4 lg:w-80">
          <div className="rounded-xl bg-[#1a1f2e]">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <p className="text-sm font-semibold text-white">Konfiguracja</p>
              <SaveButton onClick={handleSave} saving={saving} className="px-4 py-1.5 text-xs" />
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Rola obsługi #1</label>
                <RoleSelect
                  value={config.ticketSupportRoleId ?? ""}
                  onChange={(v) => setConfig((c) => ({ ...c, ticketSupportRoleId: v }))}
                  roles={roles}
                  className="w-full px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">Rola obsługi #2</label>
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
                <label className="mb-1 block text-xs text-gray-500">Kanał logów ticketów</label>
                <div className="flex items-center gap-2">
                  <ChannelSelect
                    value={config.ticketLogChannelId ?? ""}
                    onChange={(v) => setConfig((c) => ({ ...c, ticketLogChannelId: v }))}
                    channels={channels}
                    placeholder="— Wybierz kanał —"
                    className="flex-1 px-3 py-2.5"
                  />
                  <CreateChannelButton
                    guildId={guildId}
                    defaultName="ticket-logi"
                    onCreated={(ch) => {
                      setChannels((prev) => [...prev, ch].sort((a, b) => a.name.localeCompare(b.name)));
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
            <div className="flex items-center gap-2">
              <ChannelSelect
                value={panelChannelId}
                onChange={setPanelChannelId}
                channels={channels}
                placeholder="— Wybierz kanał —"
                className="flex-1 px-3 py-2.5"
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
                <span className="ml-2 text-xs text-gray-500">{visibleTickets.length}</span>
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
                  className="flex items-start justify-between border-b border-white/5 px-6 py-4 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ticket.status} />
                      <a
                        href={`https://discord.com/channels/${guildId}/${ticket.threadId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-[#5865f2] hover:underline"
                      >
                        #{ticket.threadId}
                      </a>
                    </div>
                    {ticket.subject && (
                      <p className="mt-1.5 truncate text-sm text-white">{ticket.subject}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      <span>
                        User:{" "}
                        <span className="font-mono text-gray-400">{ticket.userId}</span>
                      </span>
                      {ticket.assignedTo ? (
                        <span>
                          Przejął:{" "}
                          <span className="font-mono text-gray-400">{ticket.assignedTo}</span>
                        </span>
                      ) : ticket.status === "pending" ? (
                        <span className="text-yellow-500/80">czeka na przejęcie</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="ml-4 flex shrink-0 flex-col items-end gap-2">
                    <div className="text-right text-xs text-gray-600">
                      <p>{new Date(ticket.createdAt).toLocaleDateString("pl-PL")}</p>
                      <p>
                        {new Date(ticket.createdAt).toLocaleTimeString("pl-PL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
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
