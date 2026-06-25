"use client";

import { Trash2 } from "lucide-react";
import type { CSSProperties } from "react";

import { Avatar } from "@/components/Avatar";
import { TicketStatusBadge } from "@/components/Badges";
import type { Ticket, TicketStatus } from "@/lib/api";
import { relativeTime, waitingSince } from "@/lib/time";

// Kolor grubego paska po lewej (jak akcent embeda) — inline, bo dynamicznych klas
// Tailwinda z obiektu JIT nie wygeneruje.
const STATUS_COLOR: Record<TicketStatus, string> = {
  pending: "#eab308", // yellow-500
  open: "#22c55e", // green-500
  closed: "#6b7280", // gray-500
};

function fullDate(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Nazwa użytkownika (z Discorda); gdy brak — fallback na ID w monospace. */
function UserName({ name, id }: { name?: string | null; id?: string }) {
  if (name) return <span className="font-medium text-gray-300">{name}</span>;
  return <span className="font-mono text-gray-400">{id ?? "—"}</span>;
}

/**
 * Karta ticketu w stylu listy feedbacku: kolorowy pasek statusu po lewej, autor
 * (pseudonim + @handle + czas), treść zgłoszenia i stopka z meta + akcjami.
 * Akcje są opcjonalne — przekaż tylko te handlery, które dana strona ma udostępniać
 * (np. dashboard daje wyłącznie `onClose`).
 */
export function TicketCard({
  ticket,
  index,
  guildId,
  busy = false,
  onClose,
  onReopen,
  onDelete,
}: {
  ticket: Ticket;
  index: number;
  guildId: string;
  busy?: boolean;
  onClose?: () => void;
  onReopen?: () => void;
  onDelete?: () => void;
}) {
  const nick = ticket.username ?? ticket.userId;
  const subject = ticket.subject?.trim() || "Zgłoszenie bez tematu";
  const showClose = Boolean(onClose) && ticket.status !== "closed";
  const showReopen = Boolean(onReopen) && ticket.status === "closed";
  const hasActions = showClose || showReopen || Boolean(onDelete);

  return (
    <div
      style={
        { "--i": index, borderLeftColor: STATUS_COLOR[ticket.status] } as CSSProperties
      }
      className="jh-stagger flex flex-col gap-2 rounded-lg border border-border border-l-4 bg-background/40 p-3 transition hover:bg-background"
    >
      <div className="flex items-start gap-2.5">
        <Avatar src={ticket.avatar} name={nick} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-semibold leading-tight ${
              ticket.username ? "text-white" : "font-mono text-gray-300"
            }`}
          >
            {nick}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            {ticket.userTag && (
              <>
                <span className="truncate">@{ticket.userTag}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span className="shrink-0" title={fullDate(ticket.createdAt)}>
              {relativeTime(ticket.createdAt)}
            </span>
          </div>
        </div>
        <TicketStatusBadge status={ticket.status} className="shrink-0" />
      </div>

      <p className="whitespace-pre-wrap text-sm leading-snug text-gray-300">{subject}</p>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-400">
          {ticket.assignedTo ? (
            <span>
              Przejął:{" "}
              <UserName name={ticket.assignedToUsername} id={ticket.assignedTo} />
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
        {hasActions && (
          <div className="flex items-center gap-2">
            {showReopen && (
              <button
                onClick={onReopen}
                disabled={busy}
                className="rounded-lg bg-background px-3 py-1 text-green-400 transition hover:bg-green-500/10 disabled:opacity-40"
              >
                {busy ? "…" : "Otwórz ponownie"}
              </button>
            )}
            {showClose && (
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded-lg bg-background px-3 py-1 text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
              >
                {busy ? "…" : "Zamknij"}
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                disabled={busy}
                title="Usuń ticket z bazy (i wątek na Discordzie)"
                className="rounded-lg bg-background p-1.5 text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-90 disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
