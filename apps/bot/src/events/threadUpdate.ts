import { ticketRepository } from "@jurassic-haven/db";
import type { AnyThreadChannel } from "discord.js";

import { logTicketEvent } from "../tickets/log";

/**
 * Wątek ticketu zarchiwizowany (np. auto-archiwizacja po bezczynności) — traktujemy
 * to jak zamknięcie i synchronizujemy bazę. Domknięcia przez /ticket_close są tu
 * pomijane, bo status w DB jest już wtedy "closed".
 */
export async function onThreadUpdate(
  oldThread: AnyThreadChannel,
  newThread: AnyThreadChannel,
) {
  if (oldThread.archived || !newThread.archived) return;

  const ticket = await ticketRepository.getByThread(newThread.id);
  if (!ticket || ticket.status === "closed") return;

  await ticketRepository.close(newThread.id);
  await logTicketEvent(newThread.guild, "close", {
    threadId: newThread.id,
    userId: ticket.userId,
  });
}
