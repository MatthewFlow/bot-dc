"use client";

import { Settings } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ChannelField } from "@/components/ChannelField";
import { CreateRoleButton } from "@/components/CreateRoleButton";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { PageSkeleton, Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { useChannels, useGuildConfig, useRoles } from "@/hooks/queries";
import { useRedirectOnError, useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { Channel, GuildConfig, Role } from "@/lib/api";
import { updateGuildConfig } from "@/lib/api";

function SettingsSkeleton() {
  return (
    <PageSkeleton>
      <Skeleton className="h-64 w-full max-w-xl rounded-xl" />
    </PageSkeleton>
  );
}

export default function SettingsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [config, setConfig] = useState<GuildConfig>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [saving, setSaving] = useState(false);

  const configQ = useGuildConfig(guildId);
  const rolesQ = useRoles(guildId);
  const channelsQ = useChannels(guildId);
  const loading = configQ.isLoading || rolesQ.isLoading || channelsQ.isLoading;
  useRedirectOnError(configQ.isError, configQ.error);
  useSeedOnce(configQ.data, setConfig);
  useSeedOnce(rolesQ.data, setRoles);
  useSeedOnce(channelsQ.data, setChannels);

  async function handleSave() {
    setSaving(true);
    try {
      await updateGuildConfig(guildId, {
        adminRoleId: config.adminRoleId,
        modLogChannelId: config.modLogChannelId,
      });
      toast("Zapisano zmiany.", "success");
    } catch {
      toast("Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify({
      adminRoleId: config.adminRoleId,
      modLogChannelId: config.modLogChannelId,
    }),
    handleSave,
    !loading,
  );

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="jh-in flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Konfiguracja serwera"
        icon={Settings}
        title={
          <>
            Ustawienia <span className="italic text-primary">ogólne</span>
          </>
        }
        description="Uprawnienia do komend bota i kanał logów moderacji."
        className="mb-0"
      />

      <HowItWorks
        steps={[
          "Administrator i Zarządzanie serwerem zawsze mają dostęp do komend bota.",
          "Opcjonalnie wskaż dodatkową rolę admina bota dla zaufanej ekipy.",
          "Ustaw kanał logów moderacji, by śledzić wszystkie akcje w jednym miejscu.",
          "Zmiany działają natychmiast — bez restartu bota.",
        ]}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 surface-raised rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <p className="text-sm font-semibold text-white">Ogólne</p>
            <SaveButton
              onClick={handleSave}
              saving={saving}
              autoSaveStatus={autoSaveStatus}
              className="px-4 py-1.5 text-xs"
            />
          </div>

          <div className="flex flex-col gap-5 p-6">
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Rola administratora bota
              </label>
              <div className="flex max-w-sm flex-wrap items-center gap-2">
                <RoleSelect
                  value={config.adminRoleId ?? ""}
                  onChange={(v) =>
                    setConfig((c) => ({ ...c, adminRoleId: v || undefined }))
                  }
                  roles={roles}
                  placeholder="— Nie ustawiono —"
                  className="min-w-0 flex-1 px-3 py-2.5"
                />
                <CreateRoleButton
                  guildId={guildId}
                  defaultName="Bot Admin"
                  onCreated={(role) => {
                    setRoles((prev) =>
                      [...prev, role].sort((a, b) => b.position - a.position),
                    );
                    setConfig((c) => ({ ...c, adminRoleId: role.id }));
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Dodatkowa rola dopuszczona do komend <code>/cfg_*</code> i{" "}
                <code>/mod_*</code>. Osoby z uprawnieniem Discord{" "}
                <strong>Administrator</strong> lub <strong>Zarządzanie serwerem</strong> i
                tak mają dostęp.
              </p>
            </div>

            <ChannelField
              className="max-w-sm"
              label="Kanał logów moderacji"
              value={config.modLogChannelId ?? ""}
              onChange={(v) =>
                setConfig((c) => ({ ...c, modLogChannelId: v || undefined }))
              }
              channels={channels}
              onChannelsChange={setChannels}
              guildId={guildId}
              defaultName="mod-logi"
              placeholder="— Nie ustawiono —"
              hint="Tu trafiają logi akcji moderacyjnych (ostrzeżenia, muty, kicki, bany)."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
