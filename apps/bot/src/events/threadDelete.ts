import { ticketRepository } from "@jurassic-haven/db";
import type { AnyThreadChannel } from "discord.js";

import { logTicketEvent } from "../tickets/log";

/**
 * Wątek ticketu usunięty ręcznie na Discordzie — domykamy nieaktualny wpis,
 * żeby stan w bazie nie rozjeżdżał się z rzeczywistością.
 */
export async function onThreadDelete(thread: AnyThreadChannel) {
  const ticket = await ticketRepository.getByThread(thread.id);
  if (!ticket || ticket.status === "closed") return;

  await ticketRepository.close(thread.id);
  await logTicketEvent(thread.guild, "close", {
    threadId: thread.id,
    userId: ticket.userId,
  });
}
