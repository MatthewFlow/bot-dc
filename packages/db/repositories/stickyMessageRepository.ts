import type { EmbedConfig } from "../embed";
import type { StickyMode } from "../providers/mongoose/schemas/stickyMessage.schema";

export type { StickyMode };

export type StickyMessage = {
  id: string;
  guildId: string;
  channelId: string;
  enabled: boolean;
  mode: StickyMode;
  content?: string;
  embed?: EmbedConfig;
  lastMessageId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertStickyOpts = {
  guildId: string;
  channelId: string;
  enabled: boolean;
  mode: StickyMode;
  content?: string;
  embed?: EmbedConfig;
  createdBy: string;
};

export interface IStickyMessageRepository {
  /** Tworzy/aktualizuje sticky dla kanału (jeden na kanał). */
  upsert(opts: UpsertStickyOpts): Promise<StickyMessage>;
  getByGuild(guildId: string): Promise<StickyMessage[]>;
  getByChannel(guildId: string, channelId: string): Promise<StickyMessage | null>;
  /** Zapisuje ID ostatnio wysłanej kopii (null czyści — np. po wyłączeniu). */
  setLastMessageId(id: string, messageId: string | null): Promise<void>;
  /** Usuwa konfigurację sticky; zwraca usunięty rekord (do skasowania wiadomości). */
  delete(guildId: string, channelId: string): Promise<StickyMessage | null>;
}
