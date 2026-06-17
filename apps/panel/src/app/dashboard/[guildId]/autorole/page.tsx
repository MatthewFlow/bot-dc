"use client";

import {
  CheckCircle2,
  ChevronsUp,
  DoorOpen,
  Eye,
  Lightbulb,
  RefreshCw,
  Settings,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { CreateRoleButton } from "@/components/CreateRoleButton";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { Switch } from "@/components/ui/switch";
import { useGuildConfig, useRoles } from "@/hooks/queries";
import { useRedirectOnError, useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { GuildConfig, Role } from "@/lib/api";
import { updateGuildConfig } from "@/lib/api";

/** Szkielet tylko karty z danymi — nagłówek i „Jak to działa" renderują się od razu. */
function AutoRoleSkeleton() {
  return (
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
  );
}

/** Pigułka roli w osi weryfikacji — kolor wg stanu, nazwa z realnie wybranej roli. */
function RolePill({ name, tone }: { name?: string; tone: "unverified" | "verified" }) {
  const unverified = tone === "unverified";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        unverified
          ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${unverified ? "bg-rose-400" : "bg-emerald-400"}`}
      />
      @{name ?? (unverified ? "Niezweryfikowany" : "Zweryfikowany")}
    </span>
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

  const configQ = useGuildConfig(guildId);
  const rolesQ = useRoles(guildId);
  // Bramka tylko na config; lista ról (proxy do Discorda) dopełni się w selektach w tle.
  const loading = configQ.isLoading;
  useRedirectOnError(configQ.isError, configQ.error);
  const configReady = useSeedOnce(configQ.data, (cfg) => {
    setConfig(cfg);
    setSavedRoleId(cfg.joinRoleId);
    setSavedVerifiedRoleId(cfg.verifiedRoleId);
  });
  useSeedOnce(rolesQ.data, setRoles);

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
    configReady,
  );

  const hasChanges =
    config.joinRoleId !== savedRoleId || config.verifiedRoleId !== savedVerifiedRoleId;
  const activeRole = roles.find((r) => r.id === savedRoleId);
  const activeVerifiedRole = roles.find((r) => r.id === savedVerifiedRoleId);
  // Żywe nazwy (z aktualnego wyboru) do osi weryfikacji w prawej kolumnie.
  const joinRoleName = roles.find((r) => r.id === config.joinRoleId)?.name;
  const verifiedRoleName = roles.find((r) => r.id === config.verifiedRoleId)?.name;

  return (
    <div className="jh-in flex flex-col p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Assignment Grid"
        icon={UserPlus}
        title={
          <>
            Auto-role <span className="italic text-primary">& reakcje</span>
          </>
        }
        description="Automatyczne nadawanie roli przy wejściu na serwer."
      />

      <HowItWorks
        className="mb-6"
        subtitle="Przepływ weryfikacji w czterech krokach"
        cards={[
          {
            icon: UserPlus,
            title: "Nowy członek",
            text: "Dostaje rolę „niezweryfikowanego” zaraz po wejściu na serwer.",
          },
          {
            icon: Eye,
            title: "Ograniczony dostęp",
            text: "Z tą rolą widzi tylko wybrane kanały (np. sam regulamin).",
          },
          {
            icon: Sparkles,
            title: "Weryfikacja reakcją",
            text: "Po reakcji w Reaction Roles bot nadaje rolę „zweryfikowanego”.",
          },
          {
            icon: RefreshCw,
            title: "Zdjęcie roli",
            text: "Wtedy bot automatycznie zdejmuje rolę niezweryfikowanego.",
          },
        ]}
      />

      {loading ? (
        <AutoRoleSkeleton />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 surface-raised rounded-xl bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserPlus size={18} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Nadawane automatycznie nowym członkom
                  </p>
                  <p className="text-base font-semibold text-white">
                    Auto-role przy dołączeniu
                  </p>
                </div>
              </div>
              <Switch
                checked={!!config.joinRoleId}
                onCheckedChange={(v) => {
                  if (!v) setConfig((c) => ({ ...c, joinRoleId: undefined }));
                }}
              />
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
                  onChange={(v) =>
                    setConfig((c) => ({ ...c, joinRoleId: v || undefined }))
                  }
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
                Gdy użytkownik zareaguje emoji w systemie Reaction Roles i ta rola
                zostanie mu nadana — bot automatycznie odbierze rolę niezweryfikowanego.
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

          {/* Prawa kolumna — oś weryfikacji + wskazówki (informacyjnie). */}
          <div className="flex w-full shrink-0 flex-col gap-6 lg:sticky lg:top-6 lg:w-96">
            <div className="surface-raised rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles size={16} className="mt-0.5 shrink-0 self-start text-primary" />
                <div>
                  <p className="text-sm font-semibold text-white">Przepływ weryfikacji</p>
                  <p className="text-xs text-gray-400">Droga nowego członka</p>
                </div>
              </div>
              <ol className="flex flex-col gap-1">
                {[
                  {
                    icon: DoorOpen,
                    title: "Dołącza na serwer",
                    text: "Bot natychmiast przypisuje rolę startową.",
                    pill: <RolePill name={joinRoleName} tone="unverified" />,
                  },
                  {
                    icon: Eye,
                    title: "Widzi tylko regulamin",
                    text: "Dostęp ograniczony do kanału weryfikacji.",
                  },
                  {
                    icon: Sparkles,
                    title: "Reaguje emoji ✅",
                    text: "Reaction Roles nadaje rolę docelową.",
                  },
                  {
                    icon: CheckCircle2,
                    title: "Pełny dostęp",
                    text: "Rola startowa zdjęta automatycznie.",
                    pill: <RolePill name={verifiedRoleName} tone="verified" />,
                  },
                ].map((step, i, arr) => {
                  const Icon = step.icon;
                  return (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon size={16} />
                        </span>
                        {i < arr.length - 1 && (
                          <span className="my-1 w-px flex-1 bg-border" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 pb-4">
                        <p className="text-sm font-medium text-white">{step.title}</p>
                        <p className="mt-0.5 text-xs leading-snug text-gray-400">
                          {step.text}
                        </p>
                        {step.pill && <div className="mt-1.5">{step.pill}</div>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="surface-raised rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Lightbulb size={16} className="shrink-0 text-primary" />
                <p className="text-sm font-semibold text-white">Wskazówki</p>
              </div>
              <ul className="flex flex-col gap-3">
                {[
                  {
                    icon: Sparkles,
                    node: (
                      <>
                        Najpierw skonfiguruj panel w{" "}
                        <span className="font-medium text-white">
                          Self-Roles / Reaction Roles
                        </span>{" "}
                        — auto-role korzysta z tej samej reakcji.
                      </>
                    ),
                  },
                  {
                    icon: Settings,
                    node: (
                      <>
                        Ustaw uprawnienia kanałów tak, by{" "}
                        <span className="font-medium text-white">@Niezweryfikowany</span>{" "}
                        widział wyłącznie regulamin.
                      </>
                    ),
                  },
                  {
                    icon: ChevronsUp,
                    node: (
                      <>
                        Rola bota musi być{" "}
                        <span className="font-medium text-white">wyżej</span> niż obie
                        role, by mógł je nadawać i zdejmować.
                      </>
                    ),
                  },
                ].map((tip, i) => {
                  const Icon = tip.icon;
                  return (
                    <li key={i} className="flex gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-primary">
                        <Icon size={13} />
                      </span>
                      <p className="text-xs leading-relaxed text-gray-300">{tip.node}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
