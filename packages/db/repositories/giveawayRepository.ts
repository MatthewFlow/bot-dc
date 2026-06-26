import type { GiveawayStatus } from "../providers/mongoose/schemas/giveaway.schema";

export type { GiveawayStatus };

export type Giveaway = {
  id: string;
  guildId: string;
  channelId: string;
  messageId?: string;
  prize: string;
  winnerCount: number;
  endsAt: Date;
  requiredRoleId?: string;
  hostId: string;
  status: GiveawayStatus;
  entrants: string[];
  winners: string[];
  createdAt: Date;
  endedAt?: Date;
};

export type CreateGiveawayOpts = {
  guildId: string;
  channelId: string;
  prize: string;
  winnerCount: number;
  endsAt: Date;
  hostId: string;
  requiredRoleId?: string;
};

/**
 * Losuje do `count` zwycięzców spośród `entrants` (bez powtórzeń), pomijając
 * `exclude` (np. przy rerollu — dotychczasowych zwycięzców). Czysta funkcja
 * (Fisher–Yates na kopii) — współdzielona przez bota (auto-koniec) i API (reroll),
 * testowana jednostkowo.
 */
export function pickWinners(
  entrants: readonly string[],
  count: number,
  exclude: readonly string[] = [],
): string[] {
  const excluded = new Set(exclude);
  const pool = [...new Set(entrants)].filter((id) => !excluded.has(id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, Math.max(0, count));
}

export interface IGiveawayRepository {
  create(opts: CreateGiveawayOpts): Promise<Giveaway>;
  get(id: string): Promise<Giveaway | null>;
  getByMessage(messageId: string): Promise<Giveaway | null>;
  getByGuild(guildId: string, limit?: number): Promise<Giveaway[]>;
  /** Aktywne giveawaye, którym minął czas — do auto-zakończenia przez bota. */
  getDueActive(now: Date, limit?: number): Promise<Giveaway[]>;
  setMessageId(id: string, messageId: string): Promise<void>;
  /**
   * Przełącza udział użytkownika (dołącz/zrezygnuj). Zwraca, czy po operacji
   * użytkownik bierze udział oraz aktualną liczbę uczestników — atomowo.
   */
  toggleEntry(
    id: string,
    userId: string,
  ): Promise<{ joined: boolean; count: number } | null>;
  /** Zapisuje zwycięzców i ustawia status `ended` (auto-koniec / reroll / koniec ręczny). */
  setEnded(id: string, winners: string[]): Promise<Giveaway | null>;
  /** „Zakończ teraz": przesuwa `endsAt` na teraz (sweep bota dokończy). */
  expireNow(id: string): Promise<Giveaway | null>;
  /** Anuluje giveaway (bez losowania). */
  cancel(id: string): Promise<Giveaway | null>;
}
