"use client";

import { Trash2, UserSearch } from "lucide-react";
import { type CSSProperties, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { ModActionBadge } from "@/components/badges";
import { ConfirmModal } from "@/components/confirmModal";
import { useToast } from "@/components/toast";
import { useMemberHistory, useWarnings } from "@/hooks/queries";
import { clearWarnings, type MemberSearchResult } from "@/lib/api";

import { PUNISH_META, PUNISH_ORDER, type PunishKind } from "./actionMeta";
import { MemberLookup } from "./MemberLookup";

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
  const warnsQ = useWarnings(guildId, userId);
  const historyQ = useMemberHistory(guildId, userId);
  const history = historyQ.data ?? [];

  const warnCount = warnsQ.data?.length ?? 0;
  const muteCount = history.filter((a) => a.type === "mute").length;
  const banCount = history.filter((a) => a.type === "ban").length;

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
    <div className="surface-raised rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <UserSearch className="h-4 w-4 text-primary" />
        <div>
          <p className="text-sm font-semibold text-white">Karta członka</p>
          <p className="text-xs text-gray-400">Sprawdź historię i status użytkownika</p>
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
            {/* Profil + liczniki */}
            <div className="flex items-center gap-4 rounded-lg bg-background px-4 py-3">
              <Avatar
                src={member.avatar}
                name={member.displayName ?? member.username ?? "?"}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">
                  {member.displayName ?? member.username ?? member.userId}
                </p>
                {member.username && (
                  <p className="truncate text-xs text-gray-400">@{member.username}</p>
                )}
              </div>
              <div className="flex gap-5 text-center">
                <Counter value={warnCount} label="Ostrzeżenia" cls="text-yellow-400" />
                <Counter value={muteCount} label="Wyciszenia" cls="text-indigo-400" />
                <Counter value={banCount} label="Bany" cls="text-red-400" />
              </div>
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
          message={`Usunąć wszystkie ostrzeżenia dla ${member?.displayName ?? userId}?`}
          confirmLabel="Wyczyść"
          onConfirm={handleClearWarns}
          onCancel={() => setPendingClear(false)}
        />
      )}
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
