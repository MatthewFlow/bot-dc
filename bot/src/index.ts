import { createBot } from "./bot";
import { token } from "./config/env";
import { loadConfigs } from "./config/guildConfig";
import { loadXp } from "./levels/xpStore";

// ===== INIT DATA =====
loadConfigs();
loadXp();

// ===== START BOT =====
const client = createBot();
client.login(token);
