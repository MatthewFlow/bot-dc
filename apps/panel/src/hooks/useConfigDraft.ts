"use client";

import { useState } from "react";

import { useToast } from "@/components/toast";
import { useGuildConfig } from "@/hooks/queries";
import { useRedirectOnError, useSeedOnce } from "@/hooks/queryDraft";
import type { GuildConfig, GuildConfigUpdate } from "@/lib/api";
import { updateGuildConfig } from "@/lib/api";

/**
 * Wspólny szkielet stron konfiguracyjnych: trzyma edytowalny draft configu
 * (seedowany raz z zapytania), bramkuje na błąd dostępu i udostępnia `saveConfig`
 * z ujednoliconym toastem + flagą `saving`.
 *
 * Strona dokłada tylko to, co specyficzne: scalenie swojej sekcji z defaultami,
 * snapshot dla {@link useAutoSave} i `handleSave` wołające `saveConfig(patch)`.
 * Wcześniej każda strona powielała te ~20 linii (useState + 3 hooki + try/catch).
 */
export function useConfigDraft(guildId: string): {
  config: GuildConfig;
  setConfig: React.Dispatch<React.SetStateAction<GuildConfig>>;
  saving: boolean;
  loading: boolean;
  configReady: boolean;
  saveConfig: (patch: GuildConfigUpdate) => Promise<void>;
} {
  const toast = useToast();
  const [config, setConfig] = useState<GuildConfig>({});
  const [saving, setSaving] = useState(false);

  const configQ = useGuildConfig(guildId);
  // Bramka tylko na config (nasza baza, szybko); listy kanałów/ról dociąga strona.
  useRedirectOnError(configQ.isError, configQ.error);
  const configReady = useSeedOnce(configQ.data, setConfig);

  async function saveConfig(patch: GuildConfigUpdate): Promise<void> {
    setSaving(true);
    try {
      await updateGuildConfig(guildId, patch);
      toast("Zapisano zmiany.", "success");
    } catch {
      toast("Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  return {
    config,
    setConfig,
    saving,
    loading: configQ.isLoading,
    configReady,
    saveConfig,
  };
}
