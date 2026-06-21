"use client";

import {
  Activity,
  Hash,
  LayoutGrid,
  LogIn,
  LogOut,
  type LucideIcon,
  Pencil,
  ScrollText,
  Settings,
  ShieldCheck,
  Tag,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useParams } from "next/navigation";
import { type ReactNode, useState } from "react";

import { CardHead } from "@/components/CardHead";
import { ChannelField } from "@/components/ChannelField";
import { ExemptLists } from "@/components/ExemptLists";
import { HowItWorks } from "@/components/HowItWorks";
import { MasterSwitchCard } from "@/components/MasterSwitchCard";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { useChannels, useRoles } from "@/hooks/queries";
import { useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useConfigDraft } from "@/hooks/useConfigDraft";
import type { Channel, Role, ServerLogConfig } from "@/lib/api";
import { CARD } from "@/lib/cn";

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

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  desc: string;
  icon: LucideIcon;
  iconCls: string;
}[] = [
  {
    key: "messageDelete",
    label: "Usunięte wiadomości",
    desc: "Skasowane wiadomości (autor, kanał, treść)",
    icon: Trash2,
    iconCls: "bg-red-400/10 text-red-400",
  },
  {
    key: "messageEdit",
    label: "Edytowane wiadomości",
    desc: "Zmiany treści (przed/po)",
    icon: Pencil,
    iconCls: "bg-sky-400/10 text-sky-400",
  },
  {
    key: "memberJoin",
    label: "Wejścia",
    desc: "Dołączenia nowych członków",
    icon: LogIn,
    iconCls: "bg-green-400/10 text-green-400",
  },
  {
    key: "memberLeave",
    label: "Wyjścia",
    desc: "Opuszczenia serwera",
    icon: LogOut,
    iconCls: "bg-orange-400/10 text-orange-400",
  },
  {
    key: "roleChanges",
    label: "Zmiany ról",
    desc: "Nadane i odebrane role",
    icon: ShieldCheck,
    iconCls: "bg-violet-400/10 text-violet-400",
  },
  {
    key: "nicknameChanges",
    label: "Zmiany pseudonimów",
    desc: "Zmiany nicków członków",
    icon: Tag,
    iconCls: "bg-teal-400/10 text-teal-400",
  },
];

/** Statyczny podgląd — pokazuje, jak wyglądają wpisy logów (nie pobiera danych). */
const LOG_PREVIEW: {
  icon: LucideIcon;
  iconCls: string;
  text: ReactNode;
  time: string;
}[] = [
  {
    icon: Trash2,
    iconCls: "bg-red-400/10 text-red-400",
    text: (
      <>
        <strong className="text-white">spam_bot_77</strong> — usunięto wiadomość na{" "}
        <strong className="text-primary">#czat</strong>
      </>
    ),
    time: "dziś o 12:04",
  },
  {
    icon: LogIn,
    iconCls: "bg-green-400/10 text-green-400",
    text: (
      <>
        <strong className="text-white">nowy_dino</strong> dołączył na serwer
      </>
    ),
    time: "dziś o 11:58",
  },
  {
    icon: ShieldCheck,
    iconCls: "bg-violet-400/10 text-violet-400",
    text: (
      <>
        <strong className="text-white">Rexy</strong> otrzymał rolę{" "}
        <strong className="text-primary">@Weteran</strong>
      </>
    ),
    time: "dziś o 11:41",
  },
];

/** Szkielet tylko kart z danymi — nagłówek i „Jak to działa" renderują się od razu. */
function ServerLogSkeleton() {
  return <Skeleton className="h-80 w-full rounded-xl" />;
}

export default function ServerLogPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  const { config, setConfig, saving, loading, configReady, saveConfig } =
    useConfigDraft(guildId);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const channelsQ = useChannels(guildId);
  const rolesQ = useRoles(guildId);
  // Kanały/role (proxy do Discorda) dopełnią selekty w tle — nie blokują formularza.
  useSeedOnce(channelsQ.data, setChannels);
  useSeedOnce(rolesQ.data, setRoles);

  // Scalenie z defaultami wypełnia pola brakujące w starszych zapisach (np. exemptRoleIds).
  const sl = { ...DEFAULT_SERVERLOG, ...config.serverLog };
  const setSl = (patch: Partial<ServerLogConfig>) =>
    setConfig((c) => ({
      ...c,
      serverLog: { ...DEFAULT_SERVERLOG, ...c.serverLog, ...patch },
    }));

  const handleSave = () =>
    saveConfig({ serverLog: config.serverLog ?? DEFAULT_SERVERLOG });

  const { status: autoSaveStatus } = useAutoSave(
    JSON.stringify(config.serverLog ?? DEFAULT_SERVERLOG),
    handleSave,
    configReady,
  );

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Audyt serwera"
        icon={ScrollText}
        title={
          <>
            Logi <span className="italic text-primary">serwera</span>
          </>
        }
        description="Zapisuj zdarzenia serwera na wybranym kanale."
        className="mb-0"
      />

      <HowItWorks
        subtitle="Cztery kroki do pełnego audytu serwera"
        cards={[
          {
            icon: Hash,
            title: "Wybierz kanał",
            text: "Wskaż kanał logów i włącz logowanie zdarzeń serwera.",
          },
          {
            icon: LayoutGrid,
            title: "Zaznacz kategorie",
            text: "Wiadomości, wejścia/wyjścia, role, nicki — co chcesz śledzić.",
          },
          {
            icon: UserPlus,
            title: "Dodaj wyjątki",
            text: "Role i kanały, których nie chcesz logować, pomiń.",
          },
          {
            icon: Settings,
            title: "Uprawnienia bota",
            text: "„Kto usunął” wymaga uprawnienia Wyświetlanie dziennika audytu.",
          },
        ]}
      />

      {loading ? (
        <ServerLogSkeleton />
      ) : (
        <>
          {/* Master switch */}
          <MasterSwitchCard
            eyebrow="System logów"
            title="Włącz logi serwera — "
            active={sl.enabled}
            activeLabel="aktywne"
            inactiveLabel="wyłączone"
            hint="Gdy wyłączone, nic nie jest logowane."
            onChange={(v) => setSl({ enabled: v })}
          />

          <div
            className={sl.enabled ? "" : "pointer-events-none opacity-50"}
            aria-disabled={!sl.enabled}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              {/* Kategorie */}
              <div className="min-w-0 flex-1">
                <div className={CARD}>
                  <CardHead
                    icon={LayoutGrid}
                    title="Kategorie"
                    subtitle="Które zdarzenia trafiają do logów"
                    action={
                      <SaveButton
                        onClick={handleSave}
                        saving={saving}
                        autoSaveStatus={autoSaveStatus}
                        className="px-4 py-1.5 text-xs"
                      />
                    }
                  />
                  <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    {CATEGORIES.map((cat) => (
                      <ToggleRow
                        key={cat.key}
                        icon={cat.icon}
                        iconCls={cat.iconCls}
                        label={cat.label}
                        desc={cat.desc}
                        checked={sl[cat.key]}
                        onChange={(v) => setSl({ [cat.key]: v })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Kanał + Wyjątki + Podgląd */}
              <div className="flex w-full flex-col gap-6 lg:w-96 lg:shrink-0">
                <div className={CARD}>
                  <CardHead
                    icon={Hash}
                    title="Kanał logów"
                    subtitle="Tu trafiają wszystkie włączone zdarzenia"
                  />
                  <div className="p-6">
                    <ChannelField
                      value={sl.channelId ?? ""}
                      onChange={(v) => setSl({ channelId: v || undefined })}
                      channels={channels}
                      onChannelsChange={setChannels}
                      guildId={guildId}
                      defaultName="logi-serwera"
                      hint="Prywatny kanał, widoczny dla ekipy."
                    />
                  </div>
                </div>

                <div className={CARD}>
                  <CardHead
                    icon={UserPlus}
                    title="Wyjątki"
                    subtitle="Pomijane przy logowaniu"
                  />
                  <ExemptLists
                    roles={roles}
                    channels={channels}
                    roleIds={sl.exemptRoleIds}
                    channelIds={sl.exemptChannelIds}
                    onRoleIdsChange={(ids) => setSl({ exemptRoleIds: ids })}
                    onChannelIdsChange={(ids) => setSl({ exemptChannelIds: ids })}
                  />
                </div>

                {/* Podgląd logów (statyczny) */}
                <div className={CARD}>
                  <CardHead
                    icon={Activity}
                    title="Podgląd logów"
                    subtitle="Przykładowe wpisy na #logi"
                  />
                  <div className="flex flex-col">
                    {LOG_PREVIEW.map((entry, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${entry.iconCls}`}
                        >
                          <entry.icon className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-gray-300">{entry.text}</p>
                          <p className="text-[11px] text-gray-500">{entry.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
