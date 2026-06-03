import type {
  CreateTicketOpts,
  ITicketRepository,
  Ticket,
  TicketCounts,
  TicketStatus,
} from "../../repositories/ticketRepository";
import { TicketModel } from "./schemas/ticket.schema";

function toTicket(doc: InstanceType<typeof TicketModel>): Ticket {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    threadId: doc.threadId,
    userId: doc.userId,
    status: doc.status,
    subject: doc.subject,
    assignedTo: doc.assignedTo,
    createdAt: doc.createdAt,
    claimedAt: doc.claimedAt,
    closedAt: doc.closedAt,
  };
}

export class TicketProvider implements ITicketRepository {
  async create(opts: CreateTicketOpts): Promise<Ticket> {
    const doc = await TicketModel.create(opts);
    return toTicket(doc);
  }

  async getByThread(threadId: string): Promise<Ticket | null> {
    const doc = await TicketModel.findOne({ threadId });
    return doc ? toTicket(doc) : null;
  }

  async getActiveByUser(guildId: string, userId: string): Promise<Ticket | null> {
    const doc = await TicketModel.findOne({
      guildId,
      userId,
      status: { $in: ["pending", "open"] },
    });
    return doc ? toTicket(doc) : null;
  }

  async getAll(guildId: string, status?: TicketStatus): Promise<Ticket[]> {
    const filter = status ? { guildId, status } : { guildId };
    const docs = await TicketModel.find(filter).sort({ createdAt: -1 });
    return docs.map(toTicket);
  }

  async counts(guildId: string): Promise<TicketCounts> {
    const rows = await TicketModel.aggregate<{ _id: TicketStatus; n: number }>([
      { $match: { guildId } },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]);
    const out: TicketCounts = { total: 0, pending: 0, open: 0, closed: 0 };
    for (const row of rows) {
      out[row._id] = row.n;
      out.total += row.n;
    }
    return out;
  }

  async claim(threadId: string, moderatorId: string): Promise<void> {
    await TicketModel.updateOne(
      { threadId },
      { status: "open", assignedTo: moderatorId, claimedAt: new Date() },
    );
  }

  async close(threadId: string): Promise<void> {
    await TicketModel.updateOne({ threadId }, { status: "closed", closedAt: new Date() });
  }

  async reopen(threadId: string): Promise<void> {
    await TicketModel.updateOne(
      { threadId },
      { status: "open", $unset: { closedAt: "" } },
    );
  }
}
