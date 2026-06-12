"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Bug,
  Lightbulb,
  type LucideIcon,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { ConfirmModal } from "@/components/confirmModal";
import { useToast } from "@/components/toast";
import {
  deleteGuildFeedback,
  type FeedbackCategory,
  getGuildFeedback,
  type GuildFeedback,
  markFeedbackSeen,
  queryKeys,
} from "@/lib/api";
import { dayAgo } from "@/lib/time";

const CAT: Record<FeedbackCategory, { icon: LucideIcon; cls: string }> = {
  bug: { icon: Bug, cls: "text-red-400" },
  suggestion: { icon: Lightbulb, cls: "text-primary" },
  other: { icon: MessageCircle, cls: "text-gray-300" },
};

export function NotificationBell({ guildId }: { guildId: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const key = queryKeys.guildFeedback(guildId);
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => getGuildFeedback(guildId),
    refetchInterval: 60_000,
  });
  const items = data?.items ?? [];
  // Po otwarciu badge zeruje się natychmiast (lokalnie), serwer dostaje znacznik niżej.
  const unread = open ? 0 : (data?.unread ?? 0);

  const del = useMutation({
    mutationFn: (id: string) => deleteGuildFeedback(guildId, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<GuildFeedback>(key);
      qc.setQueryData<GuildFeedback>(key, (old) =>
        old ? { ...old, items: old.items.filter((x) => x.id !== id) } : old,
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast("Nie udało się usunąć.", "error");
    },
    onSuccess: () => toast("Feedback usunięty.", "success"),
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    // Otwarcie = przeczytane: wyzeruj badge w cache i utrwal znacznik w bazie.
    if (next && (data?.unread ?? 0) > 0) {
      qc.setQueryData<GuildFeedback>(key, (old) => (old ? { ...old, unread: 0 } : old));
      markFeedbackSeen(guildId).catch(() => {});
    }
  }

  function handleDelete(id: string) {
    setConfirmId(null);
    del.mutate(id);
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        title="Feedback"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 outline-none transition hover:bg-white/5 hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-popover">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-white">Najnowsze opinie</p>
              <p className="text-xs text-gray-400">Feedback z tego serwera</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">
                  Brak feedbacku z tego serwera.
                </p>
              ) : (
                items.slice(0, 8).map((f) => {
                  const meta = CAT[f.category];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={f.id}
                      className="group flex gap-3 border-b border-border px-4 py-3 last:border-0"
                    >
                      <Icon size={16} className={`mt-0.5 shrink-0 ${meta.cls}`} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm text-gray-300">{f.message}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {f.username} · {dayAgo(f.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => setConfirmId(f.id)}
                        title="Usuń"
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 focus-visible:opacity-100 active:scale-90 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
