import {
  guildConfigRepository,
  levelFromXp,
  toDiscordEmbed,
  xpRepository,
} from "@jurassic-haven/db";
import { ChannelType, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import { applyAutoRole } from "../../levels/autorole";
import { notifyLevelUp } from "../../levels/levelUpNotify";
import { translate } from "../../translation/deepl";
import { gatherTranslatable, translationLabel } from "../../translation/handler";

const DEFAULT_WELCOME = "Siema {user}, miło że jesteś 😄";
const DEFAULT_GOODBYE = "{username} wyszedł z serwera.";

/** Przykładowe ogłoszenie The Isle do testu tłumaczenia (gdy nie podano ID). */
const SAMPLE_ANNOUNCEMENT = [
  "Hey Islanders,",
  "",
  "We're deploying a new build. You may need to restart your Steam client if the update is not immediately available to download.",
  "",
  "**Hordetesting - 0.21.659**",
  "```",
  "Additional fixes to palettes and skins",
  "Fixed tyrannosaurus drink animation not ending correctly",
  "Improved austroraptor underwater visibility",
  "```",
  "Herrerasaurus has been temporarily disabled for this build.",
].join("\n");

/** Variable replacer for test commands — uses the invoking user as the sample member. */
function testReplacer(
  interaction: ChatInputCommandInteraction,
): (template: string) => string {
  const avatar = interaction.user.displayAvatarURL({ size: 256 });
  return (template) =>
    template
      .replace(/{user}/g, `<@${interaction.user.id}>`)
      .replace(/{username}/g, interaction.user.username)
      .replace(/{server}/g, interaction.guild?.name ?? "serwer")
      .replace(/{member_count}/g, String(interaction.guild?.memberCount ?? 0))
      .replace(/{avatar}/g, avatar);
}

export async function handleCfgAddXp(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const amount = interaction.options.getInteger("amount", true);

  if (amount < 1) {
    await interaction.reply({ ephemeral: true, content: "Ilość XP musi być >= 1." });
    return;
  }

  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const targetMember = await guild.members.fetch(targetUser.id);

  const oldXp = await xpRepository.getXp(guildId, targetUser.id);
  const oldLevel = levelFromXp(oldXp);

  const result = await xpRepository.addXp(guildId, targetUser.id, amount);

  await applyAutoRole(targetMember, result.newLevel).catch(() => {});

  if (result.newLevel > oldLevel) {
    const cfg = await guildConfigRepository.get(guildId);
    const target = cfg?.roleRewards
      ?.slice()
      .sort((a, b) => a.level - b.level)
      .filter((r) => r.level <= result.newLevel)
      .at(-1);

    await notifyLevelUp(
      targetMember,
      result.newLevel,
      target ? `<@&${target.roleId}>` : undefined,
    );
  }

  const newXp = await xpRepository.getXp(guildId, targetUser.id);

  await interaction.reply({
    ephemeral: true,
    content:
      `Dodano **+${amount} XP** dla ${targetUser}\n` +
      `XP: **${oldXp} → ${newXp}**\n` +
      `Level: **${oldLevel} → ${result.newLevel}**`,
  });
}

/**
 * `/test_translate` — sprawdza tłumaczenie DeepL. Bez argumentu tłumaczy wbudowaną
 * próbkę ogłoszenia; z `wiadomosc_id` pobiera tę wiadomość z bieżącego kanału i ją
 * tłumaczy. Odpowiada ephemerally (nie zaśmieca kanału). Język bierze z configu.
 */
export async function handleTestTranslate(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const cfg = await guildConfigRepository.get(guildId);
  const targetLang = cfg?.translation?.targetLang ?? "PL";
  const messageId = interaction.options.getString("wiadomosc_id");

  // DeepL bywa wolniejszy niż 3 s — defer, by nie wygasł token interakcji.
  await interaction.deferReply({ ephemeral: true });

  let source = SAMPLE_ANNOUNCEMENT;
  if (messageId) {
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased()) {
      await interaction.editReply("Użyj tej komendy na kanale tekstowym.");
      return;
    }
    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (!msg) {
      await interaction.editReply(
        "Nie znaleziono wiadomości o tym ID na tym kanale (uruchom komendę tam, gdzie jest wiadomość).",
      );
      return;
    }
    source = gatherTranslatable(msg);
    if (!source) {
      await interaction.editReply("Ta wiadomość nie ma tekstu do przetłumaczenia.");
      return;
    }
  }

  const translated = await translate(source, targetLang);
  if (!translated) {
    await interaction.editReply(
      "Tłumaczenie nie powiodło się — sprawdź, czy ustawiono `DEEPL_API_KEY`.",
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xd4a843)
    .setAuthor({ name: `${translationLabel(targetLang)} (TEST)` })
    .setDescription(translated.slice(0, 4096));

  await interaction.editReply({ embeds: [embed] });
}

export async function handleTestWelcome(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const cfg = await guildConfigRepository.get(guildId);
  const channelId = cfg?.welcomeChannelId;

  if (!channelId) {
    await interaction.reply({
      content: "Nie ustawiono kanału powitań. Użyj /cfg_setwelcome",
      ephemeral: true,
    });
    return;
  }

  const ch = guild.channels.cache.get(channelId);
  const ok =
    ch &&
    (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement);

  if (!ok) {
    await interaction.reply({
      content: "Kanał powitań nie istnieje albo nie jest tekstowy.",
      ephemeral: true,
    });
    return;
  }

  const replace = testReplacer(interaction);

  // Mirror the real welcome: use the configured embed when set, else legacy text.
  if (cfg?.welcomeEmbed) {
    await ch.send({ embeds: [toDiscordEmbed(cfg.welcomeEmbed, replace)] });
  } else {
    const embed = new EmbedBuilder()
      .setTitle("Witamy! (TEST)")
      .setDescription(replace(cfg?.welcomeMessage ?? DEFAULT_WELCOME))
      .setTimestamp();
    await ch.send({ embeds: [embed] });
  }

  await interaction.reply({ content: "Wysłano ✅", ephemeral: true });
}

export async function handleTestGoodbye(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const cfg = await guildConfigRepository.get(guildId);
  const channelId = cfg?.goodbyeChannelId;

  if (!channelId) {
    await interaction.reply({
      content: "Nie ustawiono kanału pożegnań. Użyj /cfg_setgoodbye",
      ephemeral: true,
    });
    return;
  }

  const ch = guild.channels.cache.get(channelId);
  const ok =
    ch &&
    (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement);

  if (!ok) {
    await interaction.reply({
      content: "Kanał pożegnań nie istnieje albo nie jest tekstowy.",
      ephemeral: true,
    });
    return;
  }

  const replace = testReplacer(interaction);

  if (cfg?.goodbyeEmbed) {
    await ch.send({ embeds: [toDiscordEmbed(cfg.goodbyeEmbed, replace)] });
  } else {
    const embed = new EmbedBuilder()
      .setTitle("Żegnamy! (TEST)")
      .setDescription(replace(cfg?.goodbyeMessage ?? DEFAULT_GOODBYE))
      .setTimestamp();
    await ch.send({ embeds: [embed] });
  }

  await interaction.reply({ content: "Wysłano ✅", ephemeral: true });
}
