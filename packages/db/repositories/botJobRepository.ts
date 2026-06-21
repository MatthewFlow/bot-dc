import type { EmbedConfig } from "../embed";
import type {
  BotJobType,
  JobRecurrence,
  JobStatus,
} from "../providers/mongoose/schemas/botJob.schema";

export type { BotJobType, JobRecurrence, JobStatus };

export type BotJob = {
  id: string;
  guildId: string;
  type: BotJobType;
  runAt: Date;
  recurrence: JobRecurrence;
  status: JobStatus;
  channelId?: string;
  embed?: EmbedConfig;
  lastError?: string;
  lastRunAt?: Date;
  createdBy: string;
  createdAt: Date;
};

export type CreateBotJobOpts = {
  guildId: string;
  type: BotJobType;
  runAt: Date;
  recurrence: JobRecurrence;
  channelId?: string;
  embed?: EmbedConfig;
  createdBy: string;
};

export interface IBotJobRepository {
  create(opts: CreateBotJobOpts): Promise<BotJob>;
  /** Zaplanowane/cykliczne zadania serwera (do listy w panelu) — bez zakończonych. */
  getActiveByGuild(guildId: string, limit: number): Promise<BotJob[]>;
  /** Zaległe zadania do wykonania (pending + runAt <= now) — dla workera bota. */
  getDue(now: Date, limit: number): Promise<BotJob[]>;
  markDone(id: string): Promise<void>;
  markError(id: string, error: string): Promise<void>;
  /** Przesuwa zadanie cykliczne na następny termin (zostaje pending). */
  reschedule(id: string, nextRunAt: Date, lastRunAt: Date): Promise<void>;
  /** Usuwa zadanie (guild-scoped). Zwraca true, gdy istniało. */
  delete(id: string, guildId: string): Promise<boolean>;
}
