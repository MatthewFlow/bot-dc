export const XP_PER_MESSAGE = 15;
export const XP_COOLDOWN_MS = 5_000;
export const XP_PER_LEVEL = 100;
export const XP_SAVE_DEBOUNCE_MS = 2_000;
export const XP_SYNCALL_DELAY_MS = 350;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpToNextLevel(xp: number): number {
  const level = levelFromXp(xp);
  return level * XP_PER_LEVEL - xp;
}
