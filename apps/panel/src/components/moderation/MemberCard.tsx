"use client";

import {
  CalendarDays,
  Gem,
  type LucideIcon,
  Sparkles,
  Ticket,
  Trash2,
  TrendingUp,
  UserSearch,
  VolumeX,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { ModActionBadge } from "@/components/badges";
import { ConfirmModal } from "@/components/confirmModal";
import { useToast } from "@/components/toast";
import { useMemberHistory, useMemberProfile } from "@/hooks/queries";
import { clearWarnings, type MemberSearchResult } from "@/lib/api";
import { CARD } from "@/lib/cn";
import { relativeTime } from "@/lib/time";

import { PUNISH_META, PUNISH_ORDER, type PunishKind } from "./actionMeta";
import { MemberLookup } from "./MemberLookup";

/** Kolor roli z int Discorda (0 = brak koloru → neutralny szary jak na Discordzie). */
function roleHex(color: number): string {
  return color === 0 ? "#99aab5" : `#${color.toString(16).padStart(6, "0")}`;
}

function Tag({
  icon: Icon,
  label,
  cls,
}: {
  icon: LucideIcon;
  label: string;
  cls: string;
}) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  sub,
  title,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: string;
  title?: string;
}) {
  return (
    <div className="min-w-0" title={title}>
      <p className="flex items-center gap-1 text-[11px] text-gray-400">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="truncate text-sm font-medium text-white">{value}</p>
      {sub && <p className="truncate text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

function Counter({ value, label, cls }: { value: number; label: string; cls: string }) {
  return (
    <div>
      <p className={`text-lg font-bold leading-tight ${cls}`}>{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

export function MemberCard({
  guildId,
  onAction,
  onChanged,
}: {
  guildId: string;
  onAction: (kind: PunishKind, member: MemberSearchResult) => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [member, setMember] = useState<MemberSearchResult | null>(null);
  const [pendingClear, setPendingClear] = useState(false);

  const userId = member?.userId ?? null;
  const profileQ = useMemberProfile(guildId, userId);
  const historyQ = useMemberHistory(guildId, userId);
  const profile = profileQ.data;
  const history = historyQ.data ?? [];

  // Liczniki ostrzeżeń z profilu (aktywne), wyciszeń/banów z pełnej historii.
  const warnCount = profile?.warnCount ?? 0;
  const muteCount = history.filter((a) => a.type === "mute").length;
  const banCount = history.filter((a) => a.type === "ban").length;

  // Dopóki profil się ładuje, pokaż dane z wyniku wyszukiwania (progresywnie).
  const displayName = profile?.displayName ?? member?.displayName ?? member?.userId;
  const username = profile?.username ?? member?.username;
  const avatar = profile?.avatar ?? member?.avatar ?? null;

  async function handleClearWarns() {
    if (!userId) return;
    setPendingClear(false);
    try {
      await clearWarnings(guildId, userId);
      toast("Ostrzeżenia usunięte.", "success");
      onChanged();
    } catch {
      toast("Nie udało się wyczyścić ostrzeżeń.", "error");
    }
  }

  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <UserSearch className="h-4 w-4 text-primary" />
        <div>
          <p className="text-sm font-semibold text-white">Karta członka</p>
          <p className="text-xs text-gray-400">Sprawdź profil, historię i status</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <MemberLookup guildId={guildId} value={member} onSelect={setMember} />

        {!member ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Wyszukaj użytkownika po nazwie, pseudonimie lub ID.
          </p>
        ) : (
          <>
            {/* Profil */}
            <div className="rounded-lg bg-background p-4">
              <div className="flex items-center gap-4">
                <Avatar src={avatar} name={displayName ?? "?"} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-base font-semibold text-white">
                      {displayName}
                    </p>
                    {profile?.boostingSince && (
                      <Tag
                        icon={Gem}
                        label="Booster"
                        cls="bg-fuchsia-400/10 text-fuchsia-300"
                      />
                    )}
                    {profile?.timeoutUntil && (
                      <Tag
                        icon={VolumeX}
                        label="Wyciszony"
                        cls="bg-indigo-400/10 text-indigo-300"
                      />
                    )}
                    {profile && !profile.onServer && (
                      <Tag
                        icon={UserSearch}
                        label="Poza serwerem"
                        cls="bg-gray-400/10 text-gray-300"
                      />
                    )}
                  </div>
                  {username && (
                    <p className="truncate text-xs text-gray-400">@{username}</p>
                  )}
                </div>
                <div className="flex gap-5 text-center">
                  <Counter value={warnCount} label="Ostrzeżenia" cls="text-yellow-400" />
                  <Counter value={muteCount} label="Wyciszenia" cls="text-indigo-400" />
                  <Counter value={banCount} label="Bany" cls="text-red-400" />
                </div>
              </div>

              {/* Siatka informacji */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
                <Info
                  icon={CalendarDays}
                  label="Dołączył"
                  value={profile?.joinedAt ? relativeTime(profile.joinedAt) : "—"}
                  title={
                    profile?.joinedAt
                      ? new Date(profile.joinedAt).toLocaleString("pl-PL")
                      : undefined
                  }
                />
                <Info
                  icon={Sparkles}
                  label="Konto"
                  value={
                    profile?.accountCreatedAt
                      ? relativeTime(profile.accountCreatedAt)
                      : "—"
                  }
                  title={
                    profile?.accountCreatedAt
                      ? new Date(profile.accountCreatedAt).toLocaleString("pl-PL")
                      : undefined
                  }
                />
                <Info
                  icon={TrendingUp}
                  label="Poziom"
                  value={`Lv. ${profile?.level ?? 0}`}
                  sub={profile ? `${profile.xp} XP` : undefined}
                />
                <Info icon={Ticket} label="Tickety" value={profile?.ticketCount ?? 0} />
              </div>

              {/* Role */}
              {profile && profile.roles.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                  {profile.roles.map((r) => (
                    <span
                      key={r.id}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs text-gray-200"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: roleHex(r.color) }}
                      />
                      {r.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Akcje na tym użytkowniku */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PUNISH_ORDER.map((kind) => {
                const meta = PUNISH_META[kind];
                return (
                  <button
                    key={kind}
                    onClick={() => onAction(kind, member)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-elevated hover:text-white"
                  >
                    <meta.icon className="size-3.5" />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Historia działań */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Historia działań
                </p>
                {warnCount > 0 && (
                  <button
                    onClick={() => setPendingClear(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Wyczyść ostrzeżenia
                  </button>
                )}
              </div>

              {historyQ.isLoading ? (
                <p className="py-4 text-center text-xs text-gray-400">Ładowanie…</p>
              ) : history.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">
                  Brak akcji moderacyjnych dla tego użytkownika.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {history.map((a, i) => (
                    <div
                      key={a.id}
                      style={{ "--i": i } as CSSProperties}
                      className="jh-stagger flex items-start gap-3 rounded-lg bg-background px-3 py-2.5"
                    >
                      <ModActionBadge
                        type={a.type}
                        variant="short"
                        className="mt-0.5 w-16 shrink-0 text-center"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white">{a.reason}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          przez {a.moderatorName ?? a.moderatorId} ·{" "}
                          {new Date(a.createdAt).toLocaleString("pl-PL")}
                          {a.extra ? ` · ${a.extra}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {pendingClear && (
        <ConfirmModal
          message={`Usunąć wszystkie ostrzeżenia dla ${displayName}?`}
          confirmLabel="Wyczyść"
          onConfirm={handleClearWarns}
          onCancel={() => setPendingClear(false)}
        />
      )}
    </div>
  );
}
