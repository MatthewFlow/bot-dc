const DISCORD_API = "https://discord.com/api/v10";

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
  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) return false;
    const ch = (await res.json()) as { guild_id?: string };
    return ch.guild_id === guildId;
  } catch {
    return false;
  }
}
