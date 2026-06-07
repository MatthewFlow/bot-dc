"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { CreateRoleButton } from "@/components/CreateRoleButton";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { GuildConfig, Role } from "@/lib/api";
import { getGuildConfig, getRoles, updateGuildConfig } from "@/lib/api";

function AutoRoleSkeleton() {
  return (
    <div className="flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 surface-raised rounded-xl bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          <div className="space-y-4 p-6">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-10 w-72 rounded-lg" />
          </div>
        </div>
        <div className="w-full lg:w-72">
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function AutoRolePage() {
  const params = useParams();
  const guildId = params.guildId as string;

  const [config, setConfig] = useState<GuildConfig>({});
  const [savedRoleId, setSavedRoleId] = useState<string | undefined>(undefined);
  const [savedVerifiedRoleId, setSavedVerifiedRoleId] = useState<string | undefined>(
    undefined,
  );
  const [roles, setRoles] = useState<Role[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loading } = useGuildLoad(
    guildId,
    (id) => Promise.all([getGuildConfig(id), getRoles(id)]),
    ([cfg, r]) => {
      setConfig(cfg);
      setSavedRoleId(cfg.joinRoleId);
      setSavedVerifiedRoleId(cfg.verifiedRoleId);
      setRoles(r);
    },
  );

  async function handleSave() {
    setSaving(true);
    try {
      await updateGuildConfig(guildId, {
        joinRoleId: config.joinRoleId,
        verifiedRoleId: config.verifiedRoleId,
      });
      setSavedRoleId(config.joinRoleId);
      setSavedVerifiedRoleId(config.verifiedRoleId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Nie udało się zapisać.");
      setTimeout(() => setError(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify({
      joinRoleId: config.joinRoleId,
      verifiedRoleId: config.verifiedRoleId,
    }),
    handleSave,
    !loading,
  );

  const hasChanges =
    config.joinRoleId !== savedRoleId || config.verifiedRoleId !== savedVerifiedRoleId;
  const activeRole = roles.find((r) => r.id === savedRoleId);
  const activeVerifiedRole = roles.find((r) => r.id === savedVerifiedRoleId);

  if (loading) return <AutoRoleSkeleton />;

  return (
    <div className="flex flex-col p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Assignment Grid"
        title={
          <>
            Auto-role <span className="italic text-primary">& reakcje</span>
          </>
        }
        description="Automatyczne nadawanie roli przy wejściu na serwer."
      />

      <HowItWorks
        className="mb-6"
        steps={[
          "Nowy członek dostaje rolę „niezweryfikowanego” zaraz po wejściu.",
          "Z tą rolą widzi ograniczony zestaw kanałów (np. tylko regulamin).",
          "Po weryfikacji przez Reaction Roles bot nadaje rolę „zweryfikowanego”.",
          "Wtedy bot automatycznie zdejmuje rolę niezweryfikowanego.",
        ]}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 surface-raised rounded-xl bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Nadawane automatycznie nowym członkom
              </p>
              <p className="text-base font-semibold text-white">
                Auto-role przy dołączeniu
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={!!config.joinRoleId}
                onChange={(e) => {
                  if (!e.target.checked)
                    setConfig((c) => ({ ...c, joinRoleId: undefined }));
                }}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div className="border-b border-border p-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Rola niezweryfikowanego
            </p>
            <p className="mb-3 text-sm text-gray-300">
              Nadawana każdemu nowemu członkowi przy dołączeniu. Zazwyczaj{" "}
              <span className="text-white">@Niezweryfikowany</span>.
            </p>
            <div className="flex max-w-sm flex-wrap items-center gap-2">
              <RoleSelect
                value={config.joinRoleId ?? ""}
                onChange={(v) => setConfig((c) => ({ ...c, joinRoleId: v || undefined }))}
                roles={roles}
                placeholder="— Nie ustawiono —"
                className="min-w-0 flex-1 px-4 py-2.5"
              />
              <CreateRoleButton
                guildId={guildId}
                defaultName="Niezweryfikowany"
                onCreated={(role) => {
                  setRoles((prev) =>
                    [...prev, role].sort((a, b) => b.position - a.position),
                  );
                  setConfig((c) => ({ ...c, joinRoleId: role.id }));
                }}
              />
            </div>
            {activeRole && (
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-background px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-discord" />
                <span className="text-sm text-white">@{activeRole.name}</span>
                <span className="ml-auto text-xs text-gray-400">
                  Aktywna rola przy dołączeniu
                </span>
              </div>
            )}
          </div>

          <div className="p-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Rola zweryfikowanego
            </p>
            <p className="mb-3 text-sm text-gray-300">
              Gdy użytkownik zareaguje emoji w systemie Reaction Roles i ta rola zostanie
              mu nadana — bot automatycznie odbierze rolę niezweryfikowanego.
            </p>
            <div className="flex max-w-sm flex-wrap items-center gap-2">
              <RoleSelect
                value={config.verifiedRoleId ?? ""}
                onChange={(v) =>
                  setConfig((c) => ({ ...c, verifiedRoleId: v || undefined }))
                }
                roles={roles}
                placeholder="— Nie ustawiono —"
                className="min-w-0 flex-1 px-4 py-2.5"
              />
              <CreateRoleButton
                guildId={guildId}
                defaultName="Zweryfikowany"
                onCreated={(role) => {
                  setRoles((prev) =>
                    [...prev, role].sort((a, b) => b.position - a.position),
                  );
                  setConfig((c) => ({ ...c, verifiedRoleId: role.id }));
                }}
              />
            </div>
            {activeVerifiedRole && (
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-background px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
                <span className="text-sm text-white">@{activeVerifiedRole.name}</span>
                <span className="ml-auto text-xs text-gray-400">
                  Aktywna rola zweryfikowanego
                </span>
              </div>
            )}
            {hasChanges && (
              <p className="mt-3 text-xs text-primary">● Masz niezapisane zmiany</p>
            )}
          </div>

          <div className="border-t border-border px-6 py-4">
            <div className="flex items-center gap-4">
              <SaveButton
                onClick={handleSave}
                saving={saving}
                saved={saved}
                autoSaveStatus={autoSaveStatus}
                disabled={!hasChanges}
                className="px-6 py-2.5"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
