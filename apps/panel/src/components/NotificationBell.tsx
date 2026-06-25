"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  Bell,
  Bug,
  CheckCheck,
  Lightbulb,
  type LucideIcon,
  MessageCircle,
  Mic,
  MicOff,
  ShieldCheck,
  Ticket as TicketIcon,
  Trash2,
  UserMinus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MOD_ACTION, TICKET_STATUS } from "@/components/Badges";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { useGuildFeedback, useModActions, useTickets } from "@/hooks/queries";
import {
  deleteGuildFeedback,
  type FeedbackCategory,
  type GuildFeedback,
  markFeedbackSeen,
  type ModActionType,
  queryKeys,
} from "@/lib/api";
import { relativeTime } from "@/lib/time";

const CAT_ICON: Record<FeedbackCategory, { icon: LucideIcon; cls: string }> = {
  bug: { icon: Bug, cls: "text-red-400" },
  suggestion: { icon: Lightbulb, cls: "text-primary" },
  other: { icon: MessageCircle, cls: "text-gray-300" },
};

const MOD_ICON: Record<ModActionType, { icon: LucideIcon; cls: string }> = {
  warn: { icon: AlertTriangle, cls: "text-yellow-400" },
  mute: { icon: MicOff, cls: "text-indigo-400" },
  unmute: { icon: Mic, cls: "text-green-400" },
  kick: { icon: UserMinus, cls: "text-orange-400" },
  ban: { icon: Ban, cls: "text-red-500" },
  unban: { icon: ShieldCheck, cls: "text-green-400" },
  clearwarns: { icon: ShieldCheck, cls: "text-gray-300" },
};

type NotifKind = "ticket" | "feedback" | "mod";

type NotifItem = {
  key: string;
  kind: NotifKind;
  icon: LucideIcon;
  iconCls: string;
  /** Główna linia (treść/temat/akcja). */
  title: string;
  /** Druga linia — kto/kontekst. */
  subtitle: string;
  createdAt: string;
  href: string;
  /** Ustawione tylko dla feedbacku — odblokowuje usuwanie. */
  feedbackId?: string;
};

const TABS: { id: NotifKind | "all"; label: string }[] = [
  { id: "all", label: "Wszystko" },
  { id: "ticket", label: "Tickety" },
  { id: "feedback", label: "Feedback" },
  { id: "mod", label: "Moderacja" },
];

export function NotificationBell({ guildId }: { guildId: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const fbKey = queryKeys.guildFeedback(guildId);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotifKind | "all">("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // Znacznik „ostatnio widziane" (ms) per serwer — liczy nieprzeczytane ponad wszystkie
  // typy bez zmian w backendzie. `null` = jeszcze nieodczytane z localStorage (brak migania).
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const seenKey = `jh_notif_seen_${guildId}`;

  // Polling co 60 s — dzwonek aktualizuje się „na żywo" bez wchodzenia na strony.
  const feedbackQ = useGuildFeedback(guildId, true);
  const ticketsQ = useTickets(guildId, undefined, true);
  const modQ = useModActions(guildId, 15, true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(seenKey);
      if (raw) {
        setLastSeen(Number(raw));
      } else {
        const now = Date.now();
        localStorage.setItem(seenKey, String(now));
        setLastSeen(now);
      }
    } catch {
      setLastSeen(Date.now());
    }
  }, [seenKey]);

  const items = useMemo<NotifItem[]>(() => {
    const out: NotifItem[] = [];

    // Tickety wymagające uwagi (nie zamknięte) — „oczekujące".
    // Array.isArray, nie `?? []`: dzwonek żyje w globalnym layoucie, więc jeden
    // endpoint zwracający nie-tablicę nie może wywrócić całego dashboardu serwera.
    for (const t of Array.isArray(ticketsQ.data) ? ticketsQ.data : []) {
      if (t.status === "closed") continue;
      out.push({
        key: `ticket-${t.id}`,
        kind: "ticket",
        icon: TicketIcon,
        iconCls: t.status === "pending" ? "text-yellow-400" : "text-green-400",
        title: t.subject?.trim() || "Nowy ticket",
        subtitle: `${t.username ?? t.userTag ?? "użytkownik"} · ${TICKET_STATUS[t.status].label}`,
        createdAt: t.createdAt,
        href: `/dashboard/${guildId}/tickets`,
      });
    }

    // Feedback z serwera.
    for (const f of Array.isArray(feedbackQ.data?.items) ? feedbackQ.data.items : []) {
      const meta = CAT_ICON[f.category];
      out.push({
        key: `feedback-${f.id}`,
        kind: "feedback",
        icon: meta.icon,
        iconCls: meta.cls,
        title: f.message,
        subtitle: f.displayName ?? f.username,
        createdAt: f.createdAt,
        href: `/dashboard/${guildId}/feedback`,
        feedbackId: f.id,
      });
    }

    // Ostatnie akcje moderacji.
    for (const m of Array.isArray(modQ.data) ? modQ.data : []) {
      const meta = MOD_ICON[m.type];
      const who = m.displayName ?? m.username ?? m.userId;
      out.push({
        key: `mod-${m.id}`,
        kind: "mod",
        icon: meta.icon,
        iconCls: meta.cls,
        title: `${MOD_ACTION[m.type].label} · ${who}`,
        subtitle: m.reason?.trim() ? m.reason : "moderacja",
        createdAt: m.createdAt,
        href: `/dashboard/${guildId}/moderation`,
      });
    }

    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [ticketsQ.data, feedbackQ.data, modQ.data, guildId]);

  const unreadByKind = useMemo(() => {
    const m = { ticket: 0, feedback: 0, mod: 0 };
    if (lastSeen === null) return m;
    for (const i of items) {
      if (new Date(i.createdAt).getTime() > lastSeen) m[i.kind] += 1;
    }
    return m;
  }, [items, lastSeen]);
  const unreadTotal = unreadByKind.ticket + unreadByKind.feedback + unreadByKind.mod;

  const visible = (tab === "all" ? items : items.filter((i) => i.kind === tab)).slice(
    0,
    12,
  );

  const del = useMutation({
    mutationFn: (id: string) => deleteGuildFeedback(guildId, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: fbKey });
      const prev = qc.getQueryData<GuildFeedback>(fbKey);
      qc.setQueryData<GuildFeedback>(fbKey, (old) =>
        old ? { ...old, items: old.items.filter((x) => x.id !== id) } : old,
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(fbKey, ctx.prev);
      toast("Nie udało się usunąć.", "error");
    },
    onSuccess: () => toast("Feedback usunięty.", "success"),
  });

  function markAllSeen() {
    const now = Date.now();
    setLastSeen(now);
    try {
      localStorage.setItem(seenKey, String(now));
    } catch {
      /* ignore */
    }
    // Wyzeruj też serwerowy licznik feedbacku, żeby strona Feedback była spójna.
    qc.setQueryData<GuildFeedback>(fbKey, (old) => (old ? { ...old, unread: 0 } : old));
    markFeedbackSeen(guildId).catch(() => {});
  }

  function handleDelete(id: string) {
    setConfirmId(null);
    del.mutate(id);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Powiadomienia"
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 outline-none transition hover:bg-white/5 hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-ring/40 ${
          unreadTotal > 0 ? "jh-bell-ring text-gray-200" : ""
        }`}
      >
        <Bell size={16} />
        {unreadTotal > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-popover">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-white">Powiadomienia</p>
              <button
                onClick={markAllSeen}
                disabled={unreadTotal === 0}
                className="flex items-center gap-1 text-xs text-gray-400 outline-none transition hover:text-gray-200 disabled:opacity-40"
              >
                <CheckCheck size={13} />
                Oznacz wszystkie
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
              {TABS.map((t) => {
                const count = t.id === "all" ? unreadTotal : unreadByKind[t.id];
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                      active
                        ? "bg-primary text-black"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    }`}
                  >
                    {t.label}
                    {count > 0 && (
                      <span
                        className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                          active ? "bg-black/20 text-black" : "bg-destructive text-white"
                        }`}
                      >
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {visible.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">
                  Brak powiadomień{tab === "all" ? "" : " w tej kategorii"}.
                </p>
              ) : (
                visible.map((n) => {
                  const Icon = n.icon;
                  const isNew =
                    lastSeen !== null && new Date(n.createdAt).getTime() > lastSeen;
                  return (
                    <Link
                      key={n.key}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="group relative flex gap-3 border-b border-border px-4 py-3 transition last:border-0 hover:bg-white/5"
                    >
                      {/* Akcent „nowe" */}
                      <span
                        className={`absolute left-0 top-0 h-full w-0.5 ${isNew ? "bg-primary" : "bg-transparent"}`}
                      />
                      <Icon size={16} className={`mt-0.5 shrink-0 ${n.iconCls}`} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm text-gray-200">{n.title}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          {n.subtitle} · {relativeTime(n.createdAt)}
                        </p>
                      </div>
                      {n.feedbackId && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmId(n.feedbackId!);
                          }}
                          title="Usuń"
                          className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 focus-visible:opacity-100 active:scale-90 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {confirmId && (
        <ConfirmModal
          message="Na pewno usunąć to zgłoszenie? Tej operacji nie można cofnąć."
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
