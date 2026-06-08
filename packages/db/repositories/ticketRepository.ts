import type { TicketStatus } from "../providers/mongoose/schemas/ticket.schema";

export type { TicketStatus };

export type Ticket = {
  id: string;
  guildId: string;
  threadId: string;
  userId: string;
  status: TicketStatus;
  subject?: string;
  assignedTo?: string;
  createdAt: Date;
  claimedAt?: Date;
  closedAt?: Date;
};

export type CreateTicketOpts = {
  guildId: string;
  threadId: string;
  userId: string;
  subject?: string;
};

export type TicketCounts = {
  total: number;
  pending: number;
  open: number;
  closed: number;
};

export interface ITicketRepository {
  create(opts: CreateTicketOpts): Promise<Ticket>;
  getByThread(threadId: string): Promise<Ticket | null>;
  /** Aktywny ticket usera = oczekujący lub przejęty (nie zamknięty). */
  getActiveByUser(guildId: string, userId: string): Promise<Ticket | null>;
  getAll(guildId: string, status?: TicketStatus): Promise<Ticket[]>;
  /** Liczby ticketów wg statusu na serwerze (do statystyk dashboardu). */
  counts(guildId: string): Promise<TicketCounts>;
  /** Przejęcie zgłoszenia przez moderatora/admina — pending → open. */
  claim(threadId: string, moderatorId: string): Promise<void>;
  close(threadId: string): Promise<void>;
  /** Ponowne otwarcie zamkniętego ticketu — closed → open. */
  reopen(threadId: string): Promise<void>;
  /** Trwałe usunięcie rekordu ticketu. */
  delete(threadId: string): Promise<void>;
}
