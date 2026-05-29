import { Client, GatewayIntentBits } from "discord.js";

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
  });

  client.on("guildMemberAdd", onMemberAdd);
  client.on("guildMemberRemove", onMemberRemove);
  client.on("messageCreate", onMessageCreate);

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await handleCommand(interaction);
  });

  return client;
}
