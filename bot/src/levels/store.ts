import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type UserState = {
  xp: number;
  lastMsgAt?: number;
};

type GuildState = Record<string, UserState>;

const dataDir = join(process.cwd(), "src", "data");
const xpPath = join(dataDir, "xp.json");

const xpData: Record<string, GuildState> = {};

export function loadXp() {
  try {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    if (!existsSync(xpPath)) return;

    const raw = readFileSync(xpPath, "utf8");
    const obj = JSON.parse(raw) as Record<string, GuildState>;
    for (const [gid, state] of Object.entries(obj)) xpData[gid] = state;

    console.log(`Wczytano XP dla serwerów: ${Object.keys(xpData).length}`);
  } catch (e) {
    console.error("Nie udało się wczytać xp.json:", e);
  }
}

function saveXp() {
  try {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    writeFileSync(xpPath, JSON.stringify(xpData, null, 2), "utf8");
  } catch (e) {
    console.error("Nie udało się zapisać xp.json:", e);
  }
}

export function getUser(guildId: string, userId: string): UserState {
  xpData[guildId] ??= {};
  xpData[guildId][userId] ??= { xp: 0 };
  return xpData[guildId][userId];
}

// Prosty system level: level = floor(xp / 100) + 1
export function levelFromXp(xp: number) {
  return Math.floor(xp / 100) + 1;
}

export function addXpWithCooldown(opts: {
  guildId: string;
  userId: string;
  now: number;
  amount: number;
  cooldownMs: number;
}) {
  const u = getUser(opts.guildId, opts.userId);

  const last = u.lastMsgAt ?? 0;
  if (opts.now - last < opts.cooldownMs) {
    const lvl = levelFromXp(u.xp);
    return { gained: 0, oldLevel: lvl, newLevel: lvl };
  }

  const oldLevel = levelFromXp(u.xp);
  u.xp += opts.amount;
  u.lastMsgAt = opts.now;

  const newLevel = levelFromXp(u.xp);
  saveXp();

  return { gained: opts.amount, oldLevel, newLevel };
}

export function getXp(guildId: string, userId: string) {
  return getUser(guildId, userId).xp;
}

/**
 * Dodaje XP bez cooldownu (pod testy / komendy administracyjne).
 * Zwraca oldLevel/newLevel żebyś mógł wykryć awans.
 */
export function addXp(guildId: string, userId: string, amount: number) {
  const u = getUser(guildId, userId);

  const oldLevel = levelFromXp(u.xp);
  u.xp += amount;

  const newLevel = levelFromXp(u.xp);
  saveXp();

  return { oldLevel, newLevel, newXp: u.xp };
}

/**
 * (Opcjonalne) Ustawia XP na konkretną wartość – turbo wygodne do testów progów.
 * Jeśli nie chcesz, usuń tę funkcję.
 */
export function setXp(guildId: string, userId: string, xp: number) {
  const u = getUser(guildId, userId);

  const oldLevel = levelFromXp(u.xp);
  u.xp = Math.max(0, xp);

  const newLevel = levelFromXp(u.xp);
  saveXp();

  return { oldLevel, newLevel, newXp: u.xp };
}
