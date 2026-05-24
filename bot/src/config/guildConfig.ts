import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type GuildConfig = {
  welcomeChannelId?: string;
  goodbyeChannelId?: string;
  levelUpChannelId?: string;
  roleRewards?: Array<{ level: number; roleId: string }>;
};

const guildConfigs = new Map<string, GuildConfig>();

const dataDir = join(process.cwd(), "src/data");
const configPath = join(dataDir, "config.json");

export function getConfig(guildId: string): GuildConfig | undefined {
  return guildConfigs.get(guildId);
}

export function setConfig(guildId: string, patch: Partial<GuildConfig>) {
  const current = guildConfigs.get(guildId) ?? {};
  const next = { ...current, ...patch };
  guildConfigs.set(guildId, next);
  saveConfigs();
}

export function loadConfigs() {
  try {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    if (!existsSync(configPath)) return;

    const raw = readFileSync(configPath, "utf8");
    const obj = JSON.parse(raw) as Record<string, GuildConfig>;

    for (const [gid, cfg] of Object.entries(obj)) {
      guildConfigs.set(gid, cfg);
    }

    console.log(`Wczytano configi: ${Object.keys(obj).length}`);
  } catch (e) {
    console.error("Nie udało się wczytać config.json:", e);
  }
}

export function saveConfigs() {
  try {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    const obj: Record<string, GuildConfig> = {};
    for (const [gid, cfg] of guildConfigs.entries()) obj[gid] = cfg;

    writeFileSync(configPath, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.error("Nie udało się zapisać config.json:", e);
  }
}
