import { Client, GatewayIntentBits } from "discord.js";

import { startApi } from "./api/server";
import { handleCommand } from "./commands/handlers/handler";
import { clearGuildCommands, registerCommands } from "./commands/register";
import { onMemberAdd } from "./events/memberAdd";
import { onMemberRemove } from "./events/memberRemove";
import { onMessageCreate } from "./events/messageCreate";

export function createBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once("clientReady", async () => {
    if (!client.user) return;

    console.log(`Zalogowano jako ${client.user.tag}`);

    try {
      if (process.env.RESET_COMMANDS === "true") {
        await clearGuildCommands(client);
      }

      await registerCommands(client);
    } catch (e) {
      console.error("Rejestracja komend nie wyszła:", e);
    }

    // ===== START API (po READY) =====
    startApi(client);
  });

  // ===== EVENTS =====
  client.on("guildMemberAdd", onMemberAdd);
  client.on("guildMemberRemove", onMemberRemove);

  // XP / levelowanie
  client.on("messageCreate", onMessageCreate);

  // Slash commands
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await handleCommand(interaction);
  });

  return client;
}
