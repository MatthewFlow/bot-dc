import type { GuildConfig } from "@jurassic-haven/db";

/** Moduły, które można włączać/wyłączać per serwer (poza automod/serverlog — te mają
 *  własny master-switch w swoim configu). */
export type ModuleKey = "leveling" | "welcome" | "tickets" | "feedback" | "selfroles";

/** Czy moduł jest aktywny na serwerze (brak na liście `disabledModules`). */
export function isModuleEnabled(cfg: GuildConfig | null, key: ModuleKey): boolean {
  return !cfg?.disabledModules?.includes(key);
}
