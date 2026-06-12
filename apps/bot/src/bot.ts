import { botStatusRepository } from "@jurassic-haven/db";
import { Client, GatewayIntentBits, Options, Partials } from "discord.js";

import { startAutoModSweep } from "./automod/automod";
import { handleButtonRoleClick } from "./buttonroles/handler";
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
import { handleFeedbackSubmit, showFeedbackModal } from "./feedback/feedback";
import { startVoiceXp } from "./levels/voiceXp";
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

/** Co ile bot odświeża heartbeat w bazie (API uznaje go za offline po ~3 nieudanych). */
const HEARTBEAT_MS = 30_000;

export function createBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.User],
    // Ograniczenie cache w RAM. Świadomie NIE ruszamy GuildMemberManager —
    // automod/autorole/role weryfikacji oraz XP głosowe czytają role z cache
    // członków, więc zostaje domyślny. Tniemy za to rzeczy nieużywane lub
    // odtwarzalne z eventów/partiali.
    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,
      MessageManager: 100, // mniej niż domyślne 200 — serverlog patrzy tylko na świeże
      ReactionManager: 0, // reakcje obsługujemy z eventu/partiala, nie z cache
      GuildInviteManager: 0, // nieużywane
      GuildScheduledEventManager: 0, // nieużywane
      AutoModerationRuleManager: 0, // mamy własny automod
    }),
    sweepers: {
      ...Options.DefaultSweeperSettings,
      // Zamiataj wiadomości starsze niż 1 h co 30 min — heavy obiekty, a serverlog
      // i tak dotyczy świeżych edycji/usunięć.
      messages: { interval: 1_800, lifetime: 3_600 },
      // Zamiataj userów-boty (poza naszym) — userów-ludzi zostawiamy, bo trzyma je
      // też cache członków (sweep mógłby je zdesynchronizować).
      users: {
        interval: 3_600,
        filter: () => (u) => u.bot && u.id !== u.client.user?.id,
      },
    },
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

    // Heartbeat do bazy — panel pokazuje na jego podstawie status online/offline.
    const beat = () =>
      botStatusRepository
        .heartbeat({
          username: client.user?.tag,
          avatar: client.user?.displayAvatarURL() ?? null,
          guildCount: client.guilds.cache.size,
        })
        .catch(() => {});
    await beat();
    setInterval(beat, HEARTBEAT_MS);

    // Naliczanie XP za obecność na kanałach głosowych (co minutę powyżej 1. min).
    startVoiceXp(client);

    // Okresowe czyszczenie mapy anty-spamu auto-moderacji.
    startAutoModSweep();
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
      else if (interaction.customId === "ticket_claim")
        await handleTicketClaim(interaction);
      else if (interaction.customId === "feedback_open")
        await showFeedbackModal(interaction);
      else if (interaction.customId.startsWith("br:"))
        await handleButtonRoleClick(interaction);
      return;
    }
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "ticket_submit") await handleTicketSubmit(interaction);
      else if (interaction.customId === "feedback_submit")
        await handleFeedbackSubmit(interaction);
    }
  });

  return client;
}
