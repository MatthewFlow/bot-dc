"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Clock,
  Database,
  DoorOpen,
  Download,
  Hash,
  History,
  type LucideIcon,
  MessageSquare,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  ToggleLeft,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { CardHead } from "@/components/CardHead";
import { ChannelField } from "@/components/ChannelField";
import { CreateRoleButton } from "@/components/CreateRoleButton";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { RoleSelect } from "@/components/RoleSelect";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { TipsCard } from "@/components/TipsCard";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useBotStatus,
  useChannels,
  useConfigAudit,
  useGuildConfig,
  useGuildStats,
  useRoles,
} from "@/hooks/queries";
import { useRedirectOnError, useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { Channel, GuildConfig, Role } from "@/lib/api";
import { queryKeys, updateGuildConfig } from "@/lib/api";
import { CARD } from "@/lib/cn";
import { relativeTime } from "@/lib/time";

/** Moduły przełączane przez `disabledModules`. Auto-moderacja i Logi serwera mają
 *  własny master-switch na swoich stronach, więc tu ich nie ma. */
const MODULES: { key: string; label: string; desc: string; icon: LucideIcon }[] = [
  {
    key: "leveling",
    label: "System poziomów",
    desc: "XP, level-upy i role za poziom",
    icon: TrendingUp,
  },
  {
    key: "welcome",
    label: "Powitania",
    desc: "Wiadomości wejścia i wyjścia",
    icon: DoorOpen,
  },
  { key: "tickets", label: "Tickety", desc: "Panel i wątki zgłoszeń", icon: Ticket },
  {
    key: "feedback",
    label: "Feedback",
    desc: "Komenda i panel opinii",
    icon: MessageSquare,
  },
  {
    key: "selfroles",
    label: "Self-role",
    desc: "Reaction i button role",
    icon: Sparkles,
  },
];

/** Formatuje uptime ze startedAt: „14d 06:21" lub „06:21". */
function formatUptime(startedAt: string | null | undefined): string {
  if (!startedAt) return "—";
  const ms = Date.now() - new Date(startedAt).getTime();
  if (ms < 0) return "—";
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return days > 0 ? `${days}d ${pad(hours)}:${pad(mins)}` : `${pad(hours)}:${pad(mins)}`;
}

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0">
      <span className="flex items-center gap-2 text-sm text-gray-400">
        <Icon className="h-4 w-4 text-gray-500" />
        {label}
      </span>
      <span className="font-mono text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

/** Karta „Informacje o bocie" — status + uptime/ping/wersja (z heartbeatu) i liczba członków. */
function BotInfoCard({ guildId }: { guildId: string }) {
  const statusQ = useBotStatus(true);
  const statsQ = useGuildStats(guildId);

  const s = statusQ.data;
  // Trójstan: null = jeszcze nie wiemy (nie pokazujemy fałszywego „Offline").
  const online = statusQ.isLoading ? null : (s?.online ?? false);
  const memberCount = statsQ.data?.memberCount;

  return (
    <div className={CARD}>
      <CardHead icon={Bot} title="Informacje o bocie" />

      <div className="flex items-center gap-3 border-b border-border p-5">
        <Avatar src={s?.avatar ?? null} name={s?.username ?? "Bot"} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">
              {s?.username ?? "Bot"}
            </p>
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
              Bot
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                online === null ? "bg-gray-500" : online ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span
              className={
                online === null
                  ? "text-gray-400"
                  : online
                    ? "text-green-400"
                    : "text-red-400"
              }
            >
              {online === null ? "Sprawdzanie…" : online ? "Online" : "Offline"}
            </span>
            {s?.version && <span className="text-gray-500">· v{s.version}</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        <StatRow icon={Clock} label="Uptime" value={formatUptime(s?.startedAt)} />
        <StatRow
          icon={Wifi}
          label="Ping"
          value={s?.ping != null ? `${s.ping} ms` : "—"}
        />
        <StatRow
          icon={Users}
          label="Członkowie"
          value={memberCount != null ? String(memberCount) : "—"}
        />
        <StatRow
          icon={Server}
          label="Serwery"
          value={s?.guildCount != null ? String(s.guildCount) : "—"}
        />
      </div>
    </div>
  );
}

/** Karta „Historia zmian" — kto i kiedy zmienił konfigurację (audyt z bazy). */
function ConfigAuditCard({ guildId }: { guildId: string }) {
  const auditQ = useConfigAudit(guildId);
  const entries = auditQ.data ?? [];

  return (
    <div className={CARD}>
      <CardHead
        icon={History}
        title="Historia zmian"
        subtitle="Kto zmieniał konfigurację"
      />
      {auditQ.isLoading ? (
        <p className="px-5 py-6 text-center text-xs text-gray-400">Ładowanie…</p>
      ) : entries.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-gray-400">
          Brak zapisanych zmian.
        </p>
      ) : (
        <div className="flex flex-col">
          {entries.map((e) => (
            <div key={e.id} className="border-b border-border px-5 py-3 last:border-0">
              <p className="truncate text-sm text-white">
                <span className="font-semibold">{e.username ?? e.userId}</span>
                <span className="text-gray-400"> zmienił</span>
              </p>
              <p className="truncate text-xs text-gray-400" title={e.fields.join(", ")}>
                {e.fields.join(", ")}
              </p>
              <p className="text-[11px] text-gray-500">{relativeTime(e.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Karta „Kopia konfiguracji" — eksport ustawień do JSON i import z pliku. */
function ConfigBackupCard({
  guildId,
  config,
  onImported,
}: {
  guildId: string;
  config: GuildConfig;
  onImported: (cfg: GuildConfig) => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function handleExport() {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jh-config-${guildId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Nieprawidłowy plik konfiguracji.");
      }
      await updateGuildConfig(guildId, parsed as Partial<GuildConfig>);
      onImported(parsed as GuildConfig);
      await qc.invalidateQueries({ queryKey: queryKeys.config(guildId) });
      qc.invalidateQueries({ queryKey: queryKeys.configAudit(guildId) });
      toast("Konfiguracja zaimportowana.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Nie udało się zaimportować.", "error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className={CARD}>
      <CardHead
        icon={Database}
        title="Kopia konfiguracji"
        subtitle="Eksport / import ustawień serwera"
      />
      <div className="flex flex-col gap-3 p-6">
        <p className="text-xs text-gray-400">
          Pobierz pełną konfigurację jako plik JSON albo przywróć ją z wcześniejszej
          kopii. Import nadpisuje obecne ustawienia.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="size-4" /> Eksportuj
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            <Upload className="size-4" /> {importing ? "Importuję…" : "Importuj"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleImportFile}
          />
        </div>
      </div>
    </div>
  );
}

/** Szkielet tylko karty z danymi — nagłówek i „Jak to działa" renderują się od razu. */
function SettingsSkeleton() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

export default function SettingsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();
  const qc = useQueryClient();

  const [config, setConfig] = useState<GuildConfig>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [saving, setSaving] = useState(false);

  const configQ = useGuildConfig(guildId);
  const rolesQ = useRoles(guildId);
  const channelsQ = useChannels(guildId);
  // Bramka tylko na config; role/kanały (proxy do Discorda) dopełnią selekty w tle.
  const loading = configQ.isLoading;
  useRedirectOnError(configQ.isError, configQ.error);
  const configReady = useSeedOnce(configQ.data, setConfig);
  useSeedOnce(rolesQ.data, setRoles);
  useSeedOnce(channelsQ.data, setChannels);

  async function handleSave() {
    setSaving(true);
    try {
      await updateGuildConfig(guildId, {
        adminRoleId: config.adminRoleId,
        modLogChannelId: config.modLogChannelId,
        disabledModules: config.disabledModules ?? [],
      });
      qc.invalidateQueries({ queryKey: queryKeys.configAudit(guildId) });
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
      disabledModules: [...(config.disabledModules ?? [])].sort(),
    }),
    handleSave,
    configReady,
  );

  const disabledModules = new Set(config.disabledModules ?? []);
  const setModuleEnabled = (key: string, enabled: boolean) =>
    setConfig((c) => {
      const next = new Set(c.disabledModules ?? []);
      if (enabled) next.delete(key);
      else next.add(key);
      return { ...c, disabledModules: [...next] };
    });

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
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
        subtitle="Cztery kroki do skonfigurowanego bota"
        cards={[
          {
            icon: ShieldCheck,
            title: "Domyślny dostęp",
            text: "Administrator i Zarządzanie serwerem zawsze mają dostęp do komend bota.",
          },
          {
            icon: UserPlus,
            title: "Dodatkowa rola",
            text: "Opcjonalnie wskaż dodatkową rolę admina bota dla zaufanej ekipy.",
          },
          {
            icon: Hash,
            title: "Kanał logów",
            text: "Ustaw kanał logów moderacji, by śledzić wszystkie akcje w jednym miejscu.",
          },
          {
            icon: Zap,
            title: "Bez restartu",
            text: "Zmiany działają natychmiast — bez restartu bota.",
          },
        ]}
      />

      {loading ? (
        <SettingsSkeleton />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Ogólne */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className={CARD}>
              <CardHead
                icon={Settings}
                title="Ogólne"
                subtitle="Uprawnienia i logi"
                action={
                  <SaveButton
                    onClick={handleSave}
                    saving={saving}
                    autoSaveStatus={autoSaveStatus}
                    className="px-4 py-1.5 text-xs"
                  />
                }
              />

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
                    <strong>Administrator</strong> lub{" "}
                    <strong>Zarządzanie serwerem</strong> i tak mają dostęp.
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

            {/* Moduły */}
            <div className={CARD}>
              <CardHead
                icon={ToggleLeft}
                title="Moduły"
                subtitle="Włącz/wyłącz funkcje bota na serwerze"
              />
              <div className="flex flex-col gap-4 p-6">
                {MODULES.map((m) => (
                  <div key={m.key} className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <m.icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-white">{m.label}</p>
                        <p className="text-xs text-gray-400">{m.desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={!disabledModules.has(m.key)}
                      onCheckedChange={(v) => setModuleEnabled(m.key, v)}
                      className="mt-1"
                    />
                  </div>
                ))}
                <p className="text-xs text-gray-500">
                  Auto-moderacja i Logi serwera mają własny przełącznik na swoich
                  stronach.
                </p>
              </div>
            </div>

            <ConfigBackupCard guildId={guildId} config={config} onImported={setConfig} />
          </div>

          {/* Informacje o bocie + Wskazówki */}
          <div className="flex w-full flex-col gap-6 lg:w-96 lg:shrink-0">
            <BotInfoCard guildId={guildId} />

            <TipsCard
              items={[
                <>
                  Trzymaj rolę bota <strong className="text-white">wysoko</strong> w
                  hierarchii, by mógł zarządzać rolami.
                </>,
                <>
                  Jeden <strong className="text-primary">#logi</strong> dla moderacji i
                  audytu ułatwia ogarnięcie serwera.
                </>,
              ]}
            />

            <ConfigAuditCard guildId={guildId} />
          </div>
        </div>
      )}
    </div>
  );
}
