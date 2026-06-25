"use client";

import {
  AlertTriangle,
  ArrowUp,
  Bug,
  Check,
  Inbox,
  Lightbulb,
  type LucideIcon,
  MessageCircle,
  MessageSquare,
  MessageSquareHeart,
  RefreshCw,
  Reply,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useParams } from "next/navigation";
import { type CSSProperties, memo, useCallback, useMemo, useRef, useState } from "react";

import { ConfirmModal } from "@/components/ConfirmModal";
import { FeedbackGuide } from "@/components/FeedbackGuide";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBotStatus, useChannels, useGuildFeedback } from "@/hooks/queries";
import { useSeedOnce } from "@/hooks/queryDraft";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useConfigDraft } from "@/hooks/useConfigDraft";
import type { Channel, Feedback, FeedbackCategory, FeedbackStatus } from "@/lib/api";
import {
  addGuildFeedbackReply,
  deleteGuildFeedback,
  sendFeedbackPanel,
  setGuildFeedbackStatus,
  submitFeedback,
  toggleGuildFeedbackUpvote,
  updateGuildConfig,
} from "@/lib/api";
import { CARD } from "@/lib/cn";
import { feedbackInputSchema } from "@/lib/schemas";
import { dayAgo } from "@/lib/time";

// Ciężka sekcja (edytor embeda + podgląd) ładowana leniwie — schodzi z initial bundle.
const FeedbackPanelSection = dynamic(
  () => import("@/components/FeedbackPanelSection").then((m) => m.FeedbackPanelSection),
  { loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
);

const CATEGORIES: { value: FeedbackCategory; label: string; icon: LucideIcon }[] = [
  { value: "bug", label: "Błąd", icon: Bug },
  { value: "suggestion", label: "Sugestia", icon: Lightbulb },
  { value: "other", label: "Inne", icon: MessageCircle },
];

const RATING_WORDS = ["Słabo", "Może być", "OK", "Dobrze", "Super"] as const;

const CAT_META: Record<
  FeedbackCategory,
  {
    label: string;
    icon: LucideIcon;
    badge: "default" | "secondary" | "destructive";
    accent: string;
  }
> = {
  bug: { label: "Błąd", icon: Bug, badge: "destructive", accent: "border-l-destructive" },
  suggestion: {
    label: "Sugestia",
    icon: Lightbulb,
    badge: "default",
    accent: "border-l-primary",
  },
  other: {
    label: "Inne",
    icon: MessageCircle,
    badge: "secondary",
    accent: "border-l-gray-500",
  },
};

const STATUS_META: Record<FeedbackStatus, { label: string; dot: string; text: string }> =
  {
    new: { label: "Nowe", dot: "bg-blue-400", text: "text-blue-300" },
    in_progress: { label: "W trakcie", dot: "bg-amber-400", text: "text-amber-300" },
    resolved: { label: "Zrobione", dot: "bg-success", text: "text-success" },
  };

const STATUS_ORDER: FeedbackStatus[] = ["new", "in_progress", "resolved"];

type FilterKey = "all" | "bug" | "suggestion" | "unresolved";

/** Inicjałowy avatar autora — kolor wyprowadzony z nazwy (deterministyczny). */
const AVATAR_TINTS = [
  "bg-violet-500/20 text-violet-300",
  "bg-sky-500/20 text-sky-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-rose-500/20 text-rose-300",
  "bg-amber-500/20 text-amber-300",
];
function AuthorAvatar({ name, src }: { name: string; src?: string | null }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-lg object-cover"
      />
    );
  }
  const initials = name.slice(0, 2).toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const tint = AVATAR_TINTS[h % AVATAR_TINTS.length];
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${tint}`}
    >
      {initials}
    </span>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  tint,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  tint: string;
}) {
  return (
    <div className={`${CARD} flex items-center gap-3 p-4`}>
      <span className={`flex size-10 items-center justify-center rounded-lg ${tint}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="truncate text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

/**
 * Scala wynik mutacji (status / głos / odpowiedź) z istniejącym rekordem, zachowując
 * już rozwiązaną tożsamość autora. Mutacje zwracają tylko zapisane pola — dla starych
 * rekordów displayName/avatar są null, więc zwykły merge skasowałby avatar i pseudonim.
 */
function mergeFeedbackUpdate(prev: Feedback, updated: Feedback): Feedback {
  return {
    ...updated,
    displayName: prev.displayName ?? updated.displayName,
    avatar: prev.avatar ?? updated.avatar,
    username: prev.username ?? updated.username,
  };
}

interface SubmissionCardProps {
  item: Feedback;
  index: number;
  onStatus: (id: string, status: FeedbackStatus) => void;
  onUpvote: (id: string) => void;
  onReply: (id: string, text: string) => Promise<boolean>;
  onRequestDelete: (id: string) => void;
}

/**
 * Pojedyncza karta zgłoszenia — `memo` + lokalny stan odpowiedzi. Dzięki temu pisanie
 * w formularzu czy w odpowiedzi nie re-renderuje całej (do 50-elementowej) listy z 50
 * dropdownami statusu. Handlery z rodzica są stabilne (useCallback), więc memo działa.
 */
const SubmissionCard = memo(function SubmissionCard({
  item,
  index,
  onStatus,
  onUpvote,
  onReply,
  onRequestDelete,
}: SubmissionCardProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const meta = CAT_META[item.category];
  const Icon = meta.icon;
  const status = STATUS_META[item.status];
  const date = new Date(item.createdAt);

  async function submitReply() {
    const text = replyText.trim();
    if (!text) return;
    setReplying(true);
    const ok = await onReply(item.id, text);
    setReplying(false);
    if (ok) {
      setReplyText("");
      setReplyOpen(false);
    }
  }

  return (
    <div
      style={{ "--i": index } as CSSProperties}
      className={`jh-stagger group flex flex-col gap-2 rounded-lg border border-border border-l-2 ${meta.accent} bg-background/40 p-3 transition hover:bg-background`}
    >
      <div className="flex items-start gap-2.5">
        <AuthorAvatar name={item.displayName ?? item.username} src={item.avatar} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="text-sm font-semibold leading-tight text-white">
              {item.displayName ?? item.username}
            </span>
            {item.rating ? (
              <span className="flex items-center gap-0.5 text-xs text-primary">
                <Star className="h-3 w-3 fill-primary" />
                {item.rating}/5
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="truncate">@{item.username}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0" title={date.toLocaleString("pl-PL")}>
              {dayAgo(date)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={meta.badge}>
            <Icon className="size-3" />
            {meta.label}
          </Badge>
          <Select
            value={item.status}
            onValueChange={(v) => onStatus(item.id, v as FeedbackStatus)}
          >
            <SelectTrigger
              className={`h-7 w-auto gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-semibold shadow-none ${status.text}`}
            >
              <span className={`inline-block size-1.5 rounded-full ${status.dot}`} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm text-gray-300">{item.message}</p>

      {item.replies.length > 0 && (
        <div className="mt-1 flex flex-col gap-2 border-l-2 border-border pl-3">
          {item.replies.map((r, ri) => (
            <div key={ri} className="text-xs">
              <span className="font-semibold text-gray-200">{r.authorName}</span>{" "}
              <span className="text-gray-400">{dayAgo(new Date(r.createdAt))}</span>
              <p className="whitespace-pre-wrap text-gray-300">{r.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stopka: głos / odpowiedz / usuń */}
      <div className="flex items-center gap-1 pt-0.5 text-xs">
        <button
          onClick={() => onUpvote(item.id)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition active:scale-95 ${
            item.upvotedByMe
              ? "bg-primary/15 text-primary"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <ArrowUp className="size-3.5" />
          {item.upvotes}
        </button>
        <button
          onClick={() => setReplyOpen((o) => !o)}
          className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-gray-400 transition hover:text-gray-200"
        >
          <Reply className="size-3.5" />
          Odpowiedz
          {item.replies.length > 0 ? ` (${item.replies.length})` : ""}
        </button>
        <button
          onClick={() => onRequestDelete(item.id)}
          title="Usuń zgłoszenie"
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 font-medium text-gray-400 transition hover:text-red-400 active:scale-95"
        >
          <Trash2 className="size-3.5" />
          Usuń
        </button>
      </div>

      {replyOpen && (
        <div className="flex flex-col gap-2 border-t border-border pt-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Napisz odpowiedź ekipy…"
            className="w-full resize-y rounded-lg bg-background px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setReplyOpen(false);
                setReplyText("");
              }}
            >
              Anuluj
            </Button>
            <Button onClick={submitReply} disabled={replying || !replyText.trim()}>
              {replying ? "Wysyłanie…" : "Odpowiedz"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

export default function FeedbackPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);

  // Wszystkie zgłoszenia z tego serwera (widoczne dla całej ekipy).
  const [list, setList] = useState<Feedback[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);
  // Lustro listy do stabilnego rollbacku w handlerach (bez `list` w zależnościach).
  const listRef = useRef(list);
  listRef.current = list;

  // Panel feedbacku (sekcja admina) — config + kanały. Draft + bramkę dostępu
  // dostarcza useConfigDraft; własny zapis panelu niżej (handleSavePanel).
  const {
    config,
    setConfig,
    configReady,
    loading: configLoading,
  } = useConfigDraft(guildId);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [sendingPanel, setSendingPanel] = useState(false);

  const feedbackQ = useGuildFeedback(guildId);
  const channelsQ = useChannels(guildId);
  // Tożsamość bota (avatar + nazwa) do podglądu „jak wystawi to bot serwera".
  const botStatusQ = useBotStatus();
  // Każda sekcja czeka tylko na swoje dane (ładowanie z góry na dół): statyczna część
  // (nagłówek, „Jak to działa", formularz) maluje się natychmiast, dane dochodzą sekcjami.
  useSeedOnce(feedbackQ.data, (fb) => setList(fb.items));
  useSeedOnce(channelsQ.data, setChannels);

  async function handleSubmit() {
    if (!category) {
      toast("Wybierz kategorię zgłoszenia.", "error");
      return;
    }
    if (rating < 1) {
      toast("Dodaj ocenę w gwiazdkach — to pole jest wymagane.", "error");
      return;
    }
    const parsed = feedbackInputSchema.safeParse({ category, message, rating, guildId });
    if (!parsed.success) {
      toast(parsed.error.issues[0]?.message ?? "Sprawdź formularz.", "error");
      return;
    }
    setSaving(true);
    try {
      const created = await submitFeedback(parsed.data);
      setList((prev) => [created, ...prev]);
      setMessage("");
      setRating(0);
      setCategory(null);
      toast("Dziękujemy! Zgłoszenie zostało wysłane.", "success");
    } catch {
      toast("Nie udało się wysłać. Spróbuj ponownie.", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    setConfirmId(null);
    setList((prev) => prev.filter((x) => x.id !== id));
    deleteGuildFeedback(guildId, id)
      .then(() => toast("Zgłoszenie usunięte.", "success"))
      .catch(() => toast("Nie udało się usunąć.", "error"));
  }

  const handleStatus = useCallback(
    async (id: string, status: FeedbackStatus) => {
      const prev = listRef.current;
      setList((l) => l.map((f) => (f.id === id ? { ...f, status } : f)));
      try {
        const updated = await setGuildFeedbackStatus(guildId, id, status);
        // Merge — zachowaj rozwiązane displayName/avatar (mutacja ich nie zwraca).
        setList((l) => l.map((f) => (f.id === id ? mergeFeedbackUpdate(f, updated) : f)));
      } catch {
        setList(prev);
        toast("Nie udało się zmienić statusu.", "error");
      }
    },
    [guildId, toast],
  );

  const handleUpvote = useCallback(
    async (id: string) => {
      const prev = listRef.current;
      setList((l) =>
        l.map((f) =>
          f.id === id
            ? {
                ...f,
                upvotedByMe: !f.upvotedByMe,
                upvotes: f.upvotes + (f.upvotedByMe ? -1 : 1),
              }
            : f,
        ),
      );
      try {
        const updated = await toggleGuildFeedbackUpvote(guildId, id);
        setList((l) => l.map((f) => (f.id === id ? mergeFeedbackUpdate(f, updated) : f)));
      } catch {
        setList(prev);
        toast("Nie udało się zagłosować.", "error");
      }
    },
    [guildId, toast],
  );

  const handleReply = useCallback(
    async (id: string, text: string): Promise<boolean> => {
      try {
        const updated = await addGuildFeedbackReply(guildId, id, text);
        setList((l) => l.map((f) => (f.id === id ? mergeFeedbackUpdate(f, updated) : f)));
        toast("Odpowiedź dodana.", "success");
        return true;
      } catch {
        toast("Nie udało się dodać odpowiedzi.", "error");
        return false;
      }
    },
    [guildId, toast],
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const r = await feedbackQ.refetch();
      if (r.data) setList(r.data.items);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSavePanel() {
    try {
      await updateGuildConfig(guildId, {
        feedbackChannelId: config.feedbackChannelId,
        feedbackPanelEmbed: config.feedbackPanelEmbed ?? null,
      });
      toast("Zapisano zmiany.", "success");
    } catch {
      toast("Nie udało się zapisać.", "error");
    }
  }

  async function handleSendPanel() {
    setSendingPanel(true);
    try {
      await sendFeedbackPanel(guildId);
      toast("Panel feedbacku wysłany na kanał.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się wysłać panelu.", "error");
    } finally {
      setSendingPanel(false);
    }
  }

  useAutoSave(
    JSON.stringify({
      feedbackChannelId: config.feedbackChannelId,
      feedbackPanelEmbed: config.feedbackPanelEmbed ?? null,
    }),
    handleSavePanel,
    configReady,
  );

  // ── Statystyki + filtry liczone z listy (memo — bez przeliczeń na każdy render) ──
  const { avg, openBugs, resolvedPct, counts } = useMemo(() => {
    const rated = list.filter((f) => f.rating);
    const resolved = list.filter((f) => f.status === "resolved").length;
    return {
      avg: rated.length
        ? (rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length).toFixed(1)
        : "—",
      openBugs: list.filter((f) => f.category === "bug" && f.status !== "resolved")
        .length,
      resolvedPct: list.length ? `${Math.round((resolved / list.length) * 100)}%` : "—",
      counts: {
        all: list.length,
        bug: list.filter((f) => f.category === "bug").length,
        suggestion: list.filter((f) => f.category === "suggestion").length,
        unresolved: list.filter((f) => f.status !== "resolved").length,
      } as Record<FilterKey, number>,
    };
  }, [list]);

  const filtered = useMemo(
    () =>
      list.filter((f) =>
        filter === "all"
          ? true
          : filter === "unresolved"
            ? f.status !== "resolved"
            : f.category === filter,
      ),
    [list, filter],
  );

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Wszystkie" },
    { key: "bug", label: "Błędy" },
    { key: "suggestion", label: "Sugestie" },
    { key: "unresolved", label: "Nierozwiązane" },
  ];

  // Stan przycisku — ocena jest wymagana (jak ustaliliśmy).
  const canSubmit = category !== null && rating > 0 && message.trim().length > 0;
  const nextStep =
    category === null
      ? "wybierz kategorię"
      : rating < 1
        ? "dodaj ocenę"
        : !message.trim()
          ? "opisz zgłoszenie"
          : "";

  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Twoja opinia"
        icon={MessageSquareHeart}
        title={
          <>
            Podziel się <span className="italic text-primary">opinią</span>
          </>
        }
        description="Zgłoś błąd, zaproponuj funkcję lub przejrzyj opinie z całego serwera."
        className="mb-0"
      />

      <FeedbackGuide />

      {/* Pasek statystyk — wchodzi, gdy lista gotowa */}
      {feedbackQ.isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Star}
            value={avg}
            label="Średnia ocena"
            tint="bg-primary/10 text-primary"
          />
          <StatCard
            icon={MessageSquare}
            value={list.length}
            label="Wszystkich opinii"
            tint="bg-sky-500/10 text-sky-300"
          />
          <StatCard
            icon={AlertTriangle}
            value={openBugs}
            label="Otwartych błędów"
            tint="bg-destructive/10 text-destructive"
          />
          <StatCard
            icon={ShieldCheck}
            value={resolvedPct}
            label="Rozwiązanych"
            tint="bg-success/10 text-success"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {/* Nowe zgłoszenie — statyczny formularz, renderuje się natychmiast */}
        <div className={CARD}>
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquareHeart className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Nowe zgłoszenie</p>
              <p className="text-xs text-gray-400">Dodaj opinię w imieniu ekipy</p>
            </div>
          </div>
          <div className="flex flex-col gap-5 p-6">
            {/* Kategoria */}
            <div>
              <label className="mb-2 block text-xs text-gray-400">
                Kategoria <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const active = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      aria-pressed={active}
                      className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition active:scale-[0.97] ${
                        active
                          ? "bg-primary text-black shadow-button"
                          : "border border-border bg-background text-gray-300 hover:text-white"
                      }`}
                    >
                      <Icon className="size-4" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ocena (wymagana) */}
            <div>
              <label className="mb-2 block text-xs text-gray-400">
                Ocena <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="p-0.5 transition-transform hover:scale-110 active:scale-90"
                    aria-label={`Ocena ${n} z 5`}
                    aria-pressed={rating === n}
                  >
                    <Star
                      className={`h-7 w-7 transition ${
                        n <= rating ? "fill-primary text-primary" : "text-gray-500"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-sm font-medium">
                  {rating ? (
                    <span className="text-gray-200">
                      {rating}/5 —{" "}
                      <span className="text-primary">{RATING_WORDS[rating - 1]}</span>
                    </span>
                  ) : (
                    <span className="text-gray-500">Wybierz ocenę</span>
                  )}
                </span>
              </div>
            </div>

            {/* Treść */}
            <div>
              <label
                className="mb-1 block text-xs text-gray-400"
                htmlFor="feedbackMessage"
              >
                Treść <span className="text-destructive">*</span>
              </label>
              <textarea
                id="feedbackMessage"
                name="feedbackMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Opisz swoje spostrzeżenie, pomysł lub problem…"
                className="w-full resize-y rounded-lg bg-background px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {message.length}/2000
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <SaveButton
                onClick={handleSubmit}
                saving={saving}
                disabled={!canSubmit}
                label="Wyślij zgłoszenie"
                className="px-5 py-2"
              />
              {canSubmit ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-success">
                  <Check className="size-3.5" />
                  Gotowe do wysłania
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-gray-400">
                  <AlertTriangle className="size-3.5 text-primary/80" />
                  Następny krok: {nextStep}.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Zgłoszenia z serwera — wchodzą, gdy lista gotowa */}
        {feedbackQ.isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <div className={CARD}>
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Zgłoszenia z serwera</p>
                <p className="text-xs text-gray-400">
                  {list.length} opinii · sortuj i zarządzaj
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Odśwież"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 outline-none transition hover:bg-white/5 hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Filtry */}
            <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    filter === f.key
                      ? "bg-elevated text-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      filter === f.key
                        ? "bg-primary/20 text-primary"
                        : "bg-white/5 text-gray-400"
                    }`}
                  >
                    {counts[f.key]}
                  </span>
                </button>
              ))}
            </div>

            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Inbox className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">Brak zgłoszeń</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Opinie wysłane przez członków serwera pojawią się tutaj.
                  </p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-gray-400">
                Brak zgłoszeń w tym filtrze.
              </div>
            ) : (
              <div className="flex max-h-[680px] flex-col gap-3 overflow-y-auto p-4">
                {filtered.map((f, i) => (
                  <SubmissionCard
                    key={f.id}
                    item={f}
                    index={i}
                    onStatus={handleStatus}
                    onUpvote={handleUpvote}
                    onReply={handleReply}
                    onRequestDelete={setConfirmId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel feedbacku — leniwie ładowana sekcja; wchodzi, gdy config gotowy */}
      {configLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <FeedbackPanelSection
          guildId={guildId}
          config={config}
          setConfig={setConfig}
          channels={channels}
          setChannels={setChannels}
          sendingPanel={sendingPanel}
          onSendPanel={handleSendPanel}
          botName={botStatusQ.data?.username ?? "Jurassic Haven"}
          botAvatar={botStatusQ.data?.avatar ?? null}
        />
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
