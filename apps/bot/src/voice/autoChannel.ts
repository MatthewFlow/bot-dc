import { type AutoVoiceHub, tempVoiceChannelRepository } from "@jurassic-haven/db";
import {
  ChannelType,
  type Client,
  type GuildMember,
  PermissionFlagsBits,
  type VoiceBasedChannel,
  type VoiceState,
} from "discord.js";

import { getCachedGuildConfig } from "../utils/configCache";

const DEFAULT_TEMPLATE = "🔊 {user}";
const DISCORD_USER_LIMIT_MAX = 99;

/** Nazwa temp-kanału z szablonu: {user} = nick twórcy, {count} = numer kolejny. */
function buildName(
  template: string | undefined,
  member: GuildMember,
  count: number,
): string {
  const t = template?.trim() || DEFAULT_TEMPLATE;
  return t
    .replace(/\{user\}/g, member.displayName)
    .replace(/\{count\}/g, String(count))
    .slice(0, 100);
}

/** Tworzy temp-kanał dla wchodzącego na hub, przenosi go i zapisuje w DB. */
async function createTempChannel(
  member: GuildMember,
  hub: AutoVoiceHub,
  hubChannel: VoiceBasedChannel,
): Promise<void> {
  const guild = member.guild;
  const count =
    (await tempVoiceChannelRepository.countByHub(guild.id, hub.channelId)) + 1;
  const userLimit =
    hub.userLimit && hub.userLimit > 0
      ? Math.min(DISCORD_USER_LIMIT_MAX, hub.userLimit)
      : undefined;

  const channel = await guild.channels.create({
    name: buildName(hub.nameTemplate, member, count),
    type: ChannelType.GuildVoice,
    parent: hub.categoryId ?? hubChannel.parentId ?? undefined,
    userLimit,
    // Twórca dostaje kontrolę nad swoim kanałem (nazwa/limit/wyrzucanie).
    permissionOverwrites: [
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.Connect,
        ],
      },
    ],
  });

  await member.voice.setChannel(channel).catch(() => {});
  await tempVoiceChannelRepository.add({
    guildId: guild.id,
    channelId: channel.id,
    hubChannelId: hub.channelId,
    ownerId: member.id,
  });
}

/** Kasuje temp-kanał, jeśli jest pusty (po wyjściu ostatniej osoby). */
async function deleteIfEmptyTemp(
  channel: VoiceBasedChannel | null,
  channelId: string,
): Promise<void> {
  const temp = await tempVoiceChannelRepository.getByChannel(channelId);
  if (!temp) return; // nie nasz temp-kanał (np. zwykły kanał albo hub)
  if (channel && channel.members.size > 0) return; // ktoś jeszcze jest

  if (channel) await channel.delete("Auto-voice: kanał pusty").catch(() => {});
  await tempVoiceChannelRepository.delete(channelId);
}

/**
 * Reaguje na zmiany stanu głosowego: wejście na „kanał-twórcę" tworzy temp-kanał,
 * a wyjście z temp-kanału kasuje go, gdy zostanie pusty. Guard `channelId !==`
 * pomija eventy bez zmiany kanału (mute/deaf), żeby nie tworzyć duplikatów.
 */
export async function handleVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  const joined = newState.channelId && newState.channelId !== oldState.channelId;
  if (joined && newState.member && newState.channel) {
    const cfg = await getCachedGuildConfig(newState.guild.id);
    const hub = cfg?.autoVoice?.find((h) => h.channelId === newState.channelId);
    if (hub) {
      await createTempChannel(newState.member, hub, newState.channel).catch((e) =>
        console.error("[autovoice] tworzenie kanału — błąd:", e),
      );
    }
  }

  if (oldState.channelId && oldState.channelId !== newState.channelId) {
    await deleteIfEmptyTemp(oldState.channel, oldState.channelId).catch(() => {});
  }
}

/** Sprząta temp-kanały po restarcie: kasuje puste/nieistniejące i czyści wpisy. */
export async function cleanupOrphanTempChannels(client: Client): Promise<void> {
  const temps = await tempVoiceChannelRepository.getAll().catch(() => []);
  for (const t of temps) {
    const channel = await client.channels.fetch(t.channelId).catch(() => null);
    if (!channel) {
      await tempVoiceChannelRepository.delete(t.channelId);
      continue;
    }
    if (channel.isVoiceBased() && channel.members.size === 0) {
      await channel.delete("Auto-voice: sprzątanie po restarcie").catch(() => {});
      await tempVoiceChannelRepository.delete(t.channelId);
    }
  }
}
