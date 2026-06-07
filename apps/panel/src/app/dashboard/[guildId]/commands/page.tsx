"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { CommandsBoard } from "@/components/CommandsBoard";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { GuildConfig } from "@/lib/api";
import { getGuildConfig, updateGuildConfig } from "@/lib/api";

function CommandsSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div>
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export default function CommandsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [config, setConfig] = useState<GuildConfig>({});
  const [saving, setSaving] = useState(false);

  const { loading } = useGuildLoad(
    guildId,
    (id) => getGuildConfig(id),
    (cfg) => setConfig(cfg),
  );

  const disabled = new Set(config.disabledCommands ?? []);
  const setDisabled = (next: Set<string>) =>
    setConfig((c) => ({ ...c, disabledCommands: [...next] }));

  async function handleSave() {
    setSaving(true);
    try {
      await updateGuildConfig(guildId, {
        disabledCommands: config.disabledCommands ?? [],
      });
      toast("Zapisano zmiany.", "success");
    } catch {
      toast("Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify([...(config.disabledCommands ?? [])].sort()),
    handleSave,
    !loading,
  );

  if (loading) return <CommandsSkeleton />;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          category="Konfiguracja serwera"
          title={
            <>
              Komendy <span className="italic text-primary">bota</span>
            </>
          }
          description="Włączaj i wyłączaj komendy bota na tym serwerze."
          className="mb-0"
        />
        <SaveButton
          onClick={handleSave}
          saving={saving}
          autoSaveStatus={autoSaveStatus}
          className="px-5 py-2"
        />
      </div>

      <HowItWorks
        steps={[
          "Suwak włączony = komenda działa na tym serwerze.",
          "Wyłącz suwak, by ją zablokować — bot odrzuci próbę użycia.",
          "„Włącz / Wyłącz wszystkie” przełącza całą kategorię naraz.",
          "Zmiany działają w ~15 s, bez restartu bota.",
        ]}
      />

      <CommandsBoard disabled={disabled} onChange={setDisabled} />
    </div>
  );
}
