"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { CreateChannelButton } from "@/components/CreateChannelButton";
import { CreateRoleButton } from "@/components/CreateRoleButton";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { Channel, GuildConfig, Role } from "@/lib/api";
import { getChannels, getGuildConfig, getRoles, updateGuildConfig } from "@/lib/api";

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div>
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-64 w-full max-w-xl rounded-xl" />
    </div>
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

  const { loading } = useGuildLoad(
    guildId,
    (id) => Promise.all([getGuildConfig(id), getRoles(id), getChannels(id)]),
    ([cfg, r, ch]) => {
      setConfig(cfg);
      setRoles(r);
      setChannels(ch);
    },
  );

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
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Konfiguracja serwera"
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

            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Kanał logów moderacji
              </label>
              <div className="flex max-w-sm flex-wrap items-center gap-2">
                <ChannelSelect
                  value={config.modLogChannelId ?? ""}
                  onChange={(v) =>
                    setConfig((c) => ({ ...c, modLogChannelId: v || undefined }))
                  }
                  channels={channels}
                  placeholder="— Nie ustawiono —"
                  className="min-w-0 flex-1 px-3 py-2.5"
                />
                <CreateChannelButton
                  guildId={guildId}
                  defaultName="mod-logi"
                  onCreated={(ch) => {
                    setChannels((prev) =>
                      [...prev, ch].sort((a, b) => a.name.localeCompare(b.name)),
                    );
                    setConfig((c) => ({ ...c, modLogChannelId: ch.id }));
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Tu trafiają logi akcji moderacyjnych (ostrzeżenia, muty, kicki, bany).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
