export type ConfigAuditEntry = {
  id: string;
  guildId: string;
  userId: string;
  username?: string;
  fields: string[];
  createdAt: Date;
};

export type AddConfigAuditOpts = {
  guildId: string;
  userId: string;
  username?: string;
  fields: string[];
};

export interface IConfigAuditRepository {
  add(opts: AddConfigAuditOpts): Promise<void>;
  getRecent(guildId: string, limit: number): Promise<ConfigAuditEntry[]>;
}
