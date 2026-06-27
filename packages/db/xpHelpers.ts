export const XP_PER_MESSAGE = 15;
export const XP_COOLDOWN_MS = 5_000;
export const XP_PER_LEVEL = 100;
export const XP_SAVE_DEBOUNCE_MS = 2_000;
export const XP_SYNCALL_DELAY_MS = 350;

/** Górny limit suwaków XP (za wiadomość / za interwał na głosie). */
export const XP_SLIDER_MAX = 8;
/** Granularność sweepa XP głosowego (1 tick = 1 minuta obecności). */
export const VOICE_XP_INTERVAL_MS = 60_000;

/** Konfigurowalny interwał naliczania XP głosowego (w minutach): 5 min – 1 h. */
export const VOICE_XP_INTERVAL_MIN_MINUTES = 5;
export const VOICE_XP_INTERVAL_MAX_MINUTES = 60;
export const VOICE_XP_INTERVAL_DEFAULT_MINUTES = 5;

/** Przytnij wartość suwaka XP do całkowitej z zakresu 0..{@link XP_SLIDER_MAX}. */
export function clampSliderXp(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(XP_SLIDER_MAX, Math.max(0, Math.round(n)));
}

/**
 * Przytnij interwał XP głosowego do całkowitych minut z zakresu 5..60
 * (domyślnie 5). Bot przyznaje XP co tyle minut obecności na głosie.
 */
export function clampVoiceInterval(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return VOICE_XP_INTERVAL_DEFAULT_MINUTES;
  return Math.min(
    VOICE_XP_INTERVAL_MAX_MINUTES,
    Math.max(VOICE_XP_INTERVAL_MIN_MINUTES, Math.round(n)),
  );
}

/**
 * Ile XP przyznać za wiadomość przy danej konfiguracji levelowania.
 * Priorytet: nowe płaskie `messageXp` → legacy `xpMultiplier × 15` → domyślne 15.
 */
export function messageXpFor(lvl?: {
  messageXp?: number;
  xpMultiplier?: number;
}): number {
  if (lvl?.messageXp != null) return clampSliderXp(lvl.messageXp);
  if (lvl?.xpMultiplier != null) {
    return Math.max(0, Math.round(XP_PER_MESSAGE * lvl.xpMultiplier));
  }
  return XP_PER_MESSAGE;
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpToNextLevel(xp: number): number {
  const level = levelFromXp(xp);
  return level * XP_PER_LEVEL - xp;
}
