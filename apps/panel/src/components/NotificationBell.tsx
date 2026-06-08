"use client";

import {
  Bell,
  Bug,
  Lightbulb,
  type LucideIcon,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/toast";
import {
  deleteGuildFeedback,
  type Feedback,
  type FeedbackCategory,
  getGuildFeedback,
  markFeedbackSeen,
} from "@/lib/api";

const CAT: Record<FeedbackCategory, { icon: LucideIcon; cls: string }> = {
  bug: { icon: Bug, cls: "text-red-400" },
  suggestion: { icon: Lightbulb, cls: "text-primary" },
  other: { icon: MessageCircle, cls: "text-gray-300" },
};

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "dziś";
  if (days === 1) return "wczoraj";
  if (days < 7) return `${days} dni temu`;
  return new Date(iso).toLocaleDateString("pl-PL");
}

export function NotificationBell({ guildId }: { guildId: string }) {
  const toast = useToast();
  const [items, setItems] = useState<Feedback[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    getGuildFeedback(guildId)
      .then((d) => {
        setItems(d.items);
        setUnread(d.unread);
      })
      .catch(() => {});
  }, [guildId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  function toggle() {
    const next = !open;
    setOpen(next);
    // Otwarcie = przeczytane: zeruj badge i utrwal znacznik w bazie.
    if (next && unread > 0) {
      setUnread(0);
      markFeedbackSeen(guildId).catch(() => {});
    }
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    deleteGuildFeedback(guildId, id)
      .then(() => toast("Feedback usunięty.", "success"))
      .catch(() => {
        toast("Nie udało się usunąć.", "error");
        load();
      });
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
                          {f.username} · {timeAgo(f.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(f.id)}
                        title="Usuń"
                        className="shrink-0 text-gray-400 opacity-0 transition hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
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
    </div>
  );
}
