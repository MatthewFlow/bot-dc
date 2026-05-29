export type XpEntry = {
  guildId: string;
  userId: string;
  xp: number;
  lastMsgAt?: number;
};

export type AddXpResult = {
  gained: number;
  oldLevel: number;
  newLevel: number;
};

export type AddXpWithCooldownOpts = {
  guildId: string;
  userId: string;
  now: number;
  amount: number;
  cooldownMs: number;
};

export interface IXpRepository {
  getXp(guildId: string, userId: string): Promise<number>;
  addXp(guildId: string, userId: string, amount: number): Promise<AddXpResult>;
  addXpWithCooldown(opts: AddXpWithCooldownOpts): Promise<AddXpResult>;
  setXp(guildId: string, userId: string, xp: number): Promise<AddXpResult>;
  getLeaderboard(guildId: string, limit: number): Promise<XpEntry[]>;
}
