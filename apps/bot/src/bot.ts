import { Client, GatewayIntentBits, Partials } from "discord.js";

import { handleCommand } from "./commands/handlers/handler";
import { clearGuildCommands, registerCommands } from "./commands/register";
import { onGuildCreate } from "./events/guildCreate";
import { onGuildDelete } from "./events/guildDelete";
import { onMemberAdd } from "./events/memberAdd";
import { onMemberRemove } from "./events/memberRemove";
import { onMessageCreate } from "./events/messageCreate";
import { onMessageReactionAdd } from "./events/messageReactionAdd";
import { onMessageReactionRemove } from "./events/messageReactionRemove";
import { onThreadDelete } from "./events/threadDelete";
import { onThreadUpdate } from "./events/threadUpdate";
import {
  onGuildMemberUpdateLog,
  onMemberJoinLog,
  onMemberLeaveLog,
  onMessageDeleteLog,
  onMessageUpdateLog,
} from "./serverlog/serverlog";
import {
  handleTicketClaim,
  handleTicketSubmit,
  showTicketModal,
} from "./tickets/handler";

export function createBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.User],
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

  client.on("guildCreate", onGuildCreate);
  client.on("guildDelete", onGuildDelete);
  client.on("guildMemberAdd", onMemberAdd);
  client.on("guildMemberRemove", onMemberRemove);
  client.on("messageCreate", onMessageCreate);
  client.on("messageReactionAdd", onMessageReactionAdd);
  client.on("messageReactionRemove", onMessageReactionRemove);
  client.on("threadDelete", onThreadDelete);
  client.on("threadUpdate", onThreadUpdate);

  // Server logging (separate listeners so logging stays decoupled).
  client.on("messageDelete", onMessageDeleteLog);
  client.on("messageUpdate", onMessageUpdateLog);
  client.on("guildMemberAdd", onMemberJoinLog);
  client.on("guildMemberRemove", onMemberLeaveLog);
  client.on("guildMemberUpdate", onGuildMemberUpdateLog);

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }
    if (interaction.isButton()) {
      if (interaction.customId === "ticket_open") await showTicketModal(interaction);
      else if (interaction.customId === "ticket_claim") await handleTicketClaim(interaction);
      return;
    }
    if (interaction.isModalSubmit() && interaction.customId === "ticket_submit") {
      await handleTicketSubmit(interaction);
    }
  });

  return client;
}
