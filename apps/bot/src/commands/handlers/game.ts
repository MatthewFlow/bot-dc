import { botJobRepository } from "@jurassic-haven/db";
import { type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import { getRcon } from "../../gameserver/manager";

async function notConfigured(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.editReply(
    "RCON serwera gry nie jest skonfigurowany (brak RCON_* w env).",
  );
}

export async function handleGameStatus(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const rcon = getRcon();
  if (!rcon) return notConfigured(interaction);
  try {
    const s = await rcon.getStatus();
    const embed = new EmbedBuilder()
      .setTitle("🦖 Serwer gry")
      .setColor(s.online ? 0x22c55e : 0x6b7280)
      .addFields(
        { name: "Status", value: s.online ? "🟢 Online" : "🔴 Offline", inline: true },
        {
          name: "Gracze",
          value: s.maxPlayers ? `${s.players}/${s.maxPlayers}` : String(s.players),
          inline: true,
        },
      );
    if (s.name) embed.addFields({ name: "Nazwa", value: s.name, inline: true });
    if (s.map) embed.addFields({ name: "Mapa", value: s.map, inline: true });
    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply("Nie udało się połączyć z serwerem gry.");
  }
}

export async function handleGamePlayers(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const rcon = getRcon();
  if (!rcon) return notConfigured(interaction);
  try {
    const players = await rcon.getPlayers();
    if (players.length === 0) {
      await interaction.editReply("Brak graczy online.");
      return;
    }
    const lines = players.map(
      (p) => `• **${p.name}**${p.dino ? ` — ${p.dino}` : ""} \`${p.id}\``,
    );
    const embed = new EmbedBuilder()
      .setTitle(`🦖 Gracze online (${players.length})`)
      .setColor(0x22c55e)
      .setDescription(lines.join("\n").slice(0, 4000));
    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply("Nie udało się pobrać listy graczy.");
  }
}

export async function handleGameAnnounce(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const rcon = getRcon();
  if (!rcon) return notConfigured(interaction);
  const message = interaction.options.getString("message", true);
  const delay = interaction.options.getInteger("za_minut");
  try {
    if (delay) {
      // Zaplanowane ogłoszenie in-game — przez kolejkę zadań (worker bota).
      await botJobRepository.create({
        guildId: interaction.guildId ?? "",
        type: "gameAnnounce",
        runAt: new Date(Date.now() + delay * 60_000),
        recurrence: "once",
        text: message,
        createdBy: interaction.user.id,
      });
      await interaction.editReply(`Ogłoszenie in-game zaplanowane za ${delay} min.`);
    } else {
      await rcon.announce(message);
      await interaction.editReply("Ogłoszenie wysłane na serwer gry.");
    }
  } catch {
    await interaction.editReply("Nie udało się wysłać ogłoszenia.");
  }
}

export async function handleGameSave(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const rcon = getRcon();
  if (!rcon) return notConfigured(interaction);
  try {
    await rcon.save();
    await interaction.editReply("Świat zapisany.");
  } catch {
    await interaction.editReply("Nie udało się zapisać świata.");
  }
}

export async function handleGameKick(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const rcon = getRcon();
  if (!rcon) return notConfigured(interaction);
  const playerId = interaction.options.getString("player", true);
  const reason = interaction.options.getString("reason") ?? undefined;
  try {
    await rcon.kick(playerId, reason);
    await interaction.editReply(`Gracz \`${playerId}\` wyrzucony z serwera gry.`);
  } catch {
    await interaction.editReply("Nie udało się wyrzucić gracza.");
  }
}

export async function handleGameBan(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const rcon = getRcon();
  if (!rcon) return notConfigured(interaction);
  const playerId = interaction.options.getString("player", true);
  const reason = interaction.options.getString("reason") ?? undefined;
  try {
    await rcon.ban(playerId, reason);
    await interaction.editReply(`Gracz \`${playerId}\` zbanowany na serwerze gry.`);
  } catch {
    await interaction.editReply("Nie udało się zbanować gracza.");
  }
}
