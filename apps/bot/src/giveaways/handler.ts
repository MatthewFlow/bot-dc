import { giveawayRepository } from "@jurassic-haven/db";
import { type ButtonInteraction, MessageFlags } from "discord.js";

/** Prefiks custom_id przycisku „Dołącz": `gw:<giveawayId>`. */
const PREFIX = "gw:";

/**
 * Klik w „🎉 Dołącz" — przełącza udział użytkownika (dołącz/zrezygnuj). Liczby
 * uczestników nie wpisujemy na wiadomość (rate-limit przy wielu klikach) — panel
 * pokazuje je na żywo z bazy, a tu potwierdzamy ephemeralnie. Wymaganą rolę
 * egzekwujemy tylko, gdy jest ustawiona na rekordzie (na przyszłość).
 */
export async function handleGiveawayJoin(interaction: ButtonInteraction): Promise<void> {
  const id = interaction.customId.slice(PREFIX.length);
  const giveaway = await giveawayRepository.get(id);

  if (!giveaway || giveaway.status !== "active") {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Ten giveaway już się zakończył.",
    });
    return;
  }

  if (giveaway.requiredRoleId && interaction.guild) {
    const member = await interaction.guild.members
      .fetch(interaction.user.id)
      .catch(() => null);
    if (!member?.roles.cache.has(giveaway.requiredRoleId)) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `Aby dołączyć, potrzebujesz roli <@&${giveaway.requiredRoleId}>.`,
      });
      return;
    }
  }

  const res = await giveawayRepository.toggleEntry(id, interaction.user.id);
  if (!res) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Ten giveaway już się zakończył.",
    });
    return;
  }

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: res.joined
      ? `🎉 Dołączyłeś do giveawaya! Uczestników: **${res.count}**.`
      : `Zrezygnowałeś z udziału. Uczestników: **${res.count}**.`,
  });
}
