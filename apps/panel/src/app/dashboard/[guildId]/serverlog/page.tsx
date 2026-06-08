"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { ChannelSelect } from "@/components/ChannelSelect";
import { CreateChannelButton } from "@/components/CreateChannelButton";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { Switch } from "@/components/ui/switch";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { Channel, GuildConfig, Role, ServerLogConfig } from "@/lib/api";
import { getChannels, getGuildConfig, getRoles, updateGuildConfig } from "@/lib/api";

const DEFAULT_SERVERLOG: ServerLogConfig = {
  enabled: false,
  channelId: undefined,
  messageDelete: true,
  messageEdit: true,
  memberJoin: true,
  memberLeave: true,
  roleChanges: true,
  nicknameChanges: true,
  exemptRoleIds: [],
  exemptChannelIds: [],
};

type CategoryKey =
  | "messageDelete"
  | "messageEdit"
  | "memberJoin"
  | "memberLeave"
  | "roleChanges"
  | "nicknameChanges";

const CATEGORIES: { key: CategoryKey; label: string; desc: string }[] = [
  {
    key: "messageDelete",
    label: "Usunięte wiadomości",
    desc: "Skasowane wiadomości (autor, kanał, treść)",
  },
  { key: "messageEdit", label: "Edytowane wiadomości", desc: "Zmiany treści (przed/po)" },
  { key: "memberJoin", label: "Wejścia", desc: "Dołączenia nowych członków" },
  { key: "memberLeave", label: "Wyjścia", desc: "Opuszczenia serwera" },
  { key: "roleChanges", label: "Zmiany ról", desc: "Nadane i odebrane role" },
  { key: "nicknameChanges", label: "Zmiany pseudonimów", desc: "Zmiany nicków członków" },
];

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-white">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}

function ServerLogSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div>
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

const CARD = "surface-raised rounded-xl border border-border bg-card";
const SECTION_HEAD = "border-b border-border px-6 py-4 text-sm font-semibold text-white";

export default function ServerLogPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [config, setConfig] = useState<GuildConfig>({});
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [saving, setSaving] = useState(false);

  const { loading } = useGuildLoad(
    guildId,
    (id) => Promise.all([getGuildConfig(id), getChannels(id), getRoles(id)]),
    ([cfg, ch, r]) => {
      setConfig(cfg);
      setChannels(ch);
      setRoles(r);
    },
  );

  // Scalenie z defaultami wypełnia pola brakujące w starszych zapisach (np. exemptRoleIds).
  const sl = { ...DEFAULT_SERVERLOG, ...config.serverLog };
  const setSl = (patch: Partial<ServerLogConfig>) =>
    setConfig((c) => ({
      ...c,
      serverLog: { ...DEFAULT_SERVERLOG, ...c.serverLog, ...patch },
    }));
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  async function handleSave() {
    setSaving(true);
    try {
      await updateGuildConfig(guildId, {
        serverLog: config.serverLog ?? DEFAULT_SERVERLOG,
      });
      toast("Zapisano zmiany.", "success");
    } catch {
      toast("Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify(config.serverLog ?? DEFAULT_SERVERLOG),
    handleSave,
    !loading,
  );

  if (loading) return <ServerLogSkeleton />;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          category="Audyt serwera"
          title={
            <>
              Logi <span className="italic text-primary">serwera</span>
            </>
          }
          description="Zapisuj zdarzenia serwera na wybranym kanale."
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
          "Wybierz kanał logów i włącz logowanie zdarzeń serwera.",
          "Zaznacz kategorie zdarzeń: wiadomości, wejścia/wyjścia, role, nicki.",
          "Dodaj wyjątki dla ról i kanałów, których nie chcesz logować.",
          "„Kto usunął” wymaga uprawnienia bota Wyświetlanie dziennika audytu.",
        ]}
      />

      <div className={`${CARD} p-6`}>
        <Toggle
          checked={sl.enabled}
          onChange={(v) => setSl({ enabled: v })}
          label="Włącz logi serwera"
          desc="Gdy wyłączone, nic nie jest logowane."
        />
      </div>

      <div className={sl.enabled ? "" : "pointer-events-none opacity-50"}>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <div className={CARD}>
              <p className={SECTION_HEAD}>Kategorie</p>
              <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                {CATEGORIES.map((cat) => (
                  <Toggle
                    key={cat.key}
                    checked={sl[cat.key]}
                    onChange={(v) => setSl({ [cat.key]: v })}
                    label={cat.label}
                    desc={cat.desc}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-6 lg:w-80">
            <div className={CARD}>
              <p className={SECTION_HEAD}>Kanał logów</p>
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <ChannelSelect
                    value={sl.channelId ?? ""}
                    onChange={(v) => setSl({ channelId: v || undefined })}
                    channels={channels}
                    placeholder="— Wybierz kanał —"
                    className="min-w-0 flex-1 px-3 py-2.5"
                  />
                  <CreateChannelButton
                    guildId={guildId}
                    defaultName="logi-serwera"
                    onCreated={(ch) => {
                      setChannels((prev) =>
                        [...prev, ch].sort((a, b) => a.name.localeCompare(b.name)),
                      );
                      setSl({ channelId: ch.id });
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Tu trafiają wszystkie włączone zdarzenia.
                </p>
              </div>
            </div>

            <div className={CARD}>
              <p className={SECTION_HEAD}>Wyjątki</p>
              <div className="flex flex-col gap-4 p-6">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">
                    Pomijane role
                  </label>
                  <RoleSelect
                    value=""
                    onChange={(v) =>
                      v &&
                      !sl.exemptRoleIds.includes(v) &&
                      setSl({ exemptRoleIds: [...sl.exemptRoleIds, v] })
                    }
                    roles={roles.filter((r) => !sl.exemptRoleIds.includes(r.id))}
                    placeholder="+ Dodaj rolę"
                    className="w-full px-3 py-2"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sl.exemptRoleIds.map((id) => (
                      <button
                        key={id}
                        onClick={() =>
                          setSl({
                            exemptRoleIds: sl.exemptRoleIds.filter((x) => x !== id),
                          })
                        }
                        className="rounded-full bg-background px-2.5 py-1 text-xs text-gray-300 hover:text-red-400"
                      >
                        @{roleName(id)} ✕
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">
                    Pomijane kanały
                  </label>
                  <ChannelSelect
                    value=""
                    onChange={(v) =>
                      v &&
                      !sl.exemptChannelIds.includes(v) &&
                      setSl({ exemptChannelIds: [...sl.exemptChannelIds, v] })
                    }
                    channels={channels.filter((c) => !sl.exemptChannelIds.includes(c.id))}
                    placeholder="+ Dodaj kanał"
                    className="w-full px-3 py-2"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sl.exemptChannelIds.map((id) => (
                      <button
                        key={id}
                        onClick={() =>
                          setSl({
                            exemptChannelIds: sl.exemptChannelIds.filter((x) => x !== id),
                          })
                        }
                        className="rounded-full bg-background px-2.5 py-1 text-xs text-gray-300 hover:text-red-400"
                      >
                        #{channelName(id)} ✕
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
