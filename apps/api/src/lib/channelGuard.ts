import { z } from "zod";

import { botHeaders, discordJson } from "./discord";

const channelSchema = z.object({ guild_id: z.string().optional() });

/**
 * True if `channelId` belongs to `guildId`. Guards the message-send endpoints
 * (`POST /channels/{id}/messages`) where the channel comes from the request body
 * or config: without this an admin of one guild could make the bot post into any
 * channel of any other guild the bot shares. Best-effort — returns false on any
 * Discord/network error so the caller refuses rather than posts blindly.
 */
export async function channelInGuild(
  channelId: string,
  guildId: string,
  botToken: string,
): Promise<boolean> {
  const ch = await discordJson(`/channels/${channelId}`, channelSchema, {
    headers: botHeaders(botToken),
  });
  return ch?.guild_id === guildId;
}
