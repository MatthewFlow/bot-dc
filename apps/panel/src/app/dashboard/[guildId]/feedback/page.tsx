"use client";

import {
  Bug,
  Inbox,
  Lightbulb,
  type LucideIcon,
  MessageCircle,
  MessageSquareHeart,
  Star,
  Trash2,
} from "lucide-react";
import { useParams } from "next/navigation";
import { type CSSProperties, useState } from "react";

import { ChannelField } from "@/components/ChannelField";
import { ConfirmModal } from "@/components/confirmModal";
import { EmbedEditor } from "@/components/EmbedEditor";
import { EmbedPreviewCard } from "@/components/EmbedPreviewCard";
import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { PanelCard } from "@/components/PanelCard";
import { SaveButton } from "@/components/SaveButton";
import { PageSkeleton, Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type {
  Channel,
  EmbedConfig,
  Feedback,
  FeedbackCategory,
  GuildConfig,
} from "@/lib/api";
import {
  deleteGuildFeedback,
  getChannels,
  getGuildConfig,
  getGuildFeedback,
  sendFeedbackPanel,
  submitFeedback,
  updateGuildConfig,
} from "@/lib/api";
import { TICKET_VARS } from "@/lib/embed";
import { dayAgo } from "@/lib/time";

const CARD = "surface-raised rounded-xl border border-border bg-card";

const DEFAULT_FEEDBACK_PANEL_EMBED: EmbedConfig = {
  title: "💡 Podziel się opinią",
  description:
    "Masz pomysł, uwagę albo znalazłeś błąd? Kliknij przycisk poniżej i napisz nam — " +
    "Twoja opinia trafi prosto do ekipy.",
  color: 0xd4a843,
};

const CATEGORIES: { value: FeedbackCategory; label: string; cls: string }[] = [
  { value: "bug", label: "🐛 Błąd", cls: "text-red-400 bg-red-400/10" },
  { value: "suggestion", label: "💡 Sugestia", cls: "text-primary bg-primary/10" },
  { value: "other", label: "💬 Inne", cls: "text-gray-300 bg-white/10" },
];

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

function FeedbackSkeleton() {
  return (
    <PageSkeleton>
      <Skeleton className="h-80 w-full rounded-xl" />
    </PageSkeleton>
  );
}

export default function FeedbackPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  // Wszystkie zgłoszenia z tego serwera (widoczne dla całej ekipy).
  const [list, setList] = useState<Feedback[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Panel feedbacku (sekcja admina) — config + kanały
  const [config, setConfig] = useState<GuildConfig>({});
  const [channels, setChannels] = useState<Channel[]>([]);
  const [sendingPanel, setSendingPanel] = useState(false);

  const { loading } = useGuildLoad(
    guildId,
    (id) => Promise.all([getGuildFeedback(id), getGuildConfig(id), getChannels(id)]),
    ([fb, cfg, ch]) => {
      setList(fb.items);
      setConfig(cfg);
      setChannels(ch);
    },
  );

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) {
      toast("Najpierw wpisz treść.", "error");
      return;
    }
    setSaving(true);
    try {
      const created = await submitFeedback({
        category,
        message: trimmed,
        rating: rating || undefined,
        guildId,
      });
      setList((prev) => [created, ...prev]);
      setMessage("");
      setRating(0);
      setCategory("suggestion");
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
    !loading,
  );

  if (loading) return <FeedbackSkeleton />;

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

      <HowItWorks
        steps={[
          "Wybierz kategorię: błąd, sugestia lub inne.",
          "Opcjonalnie dodaj ocenę w gwiazdkach (1–5).",
          "Opisz swoje spostrzeżenie i kliknij Wyślij.",
          "Po prawej widzisz wszystkie zgłoszenia z serwera — możesz je usuwać.",
        ]}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1">
          <div className={CARD}>
            <p className="border-b border-border px-6 py-4 text-sm font-semibold text-white">
              Nowe zgłoszenie
            </p>
            <div className="flex flex-col gap-5 p-6">
              {/* Kategoria */}
              <div>
                <label className="mb-2 block text-xs text-gray-400">Kategoria</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        category === cat.value
                          ? "bg-primary text-black"
                          : "bg-background text-gray-300 hover:text-white"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ocena (opcjonalna) */}
              <div>
                <label className="mb-2 block text-xs text-gray-400">
                  Ocena <span className="text-gray-400">(opcjonalnie)</span>
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n === rating ? 0 : n)}
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      className="p-0.5 text-gray-400 transition"
                      aria-label={`Ocena ${n}`}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          n <= (hover || rating)
                            ? "fill-primary text-primary"
                            : "text-gray-400"
                        }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-xs text-gray-400">{rating}/5</span>
                  )}
                </div>
              </div>

              {/* Treść */}
              <div>
                <label
                  className="mb-1 block text-xs text-gray-400"
                  htmlFor="feedbackMessage"
                >
                  Treść
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

              <div className="flex justify-end">
                <SaveButton
                  onClick={handleSubmit}
                  saving={saving}
                  disabled={!message.trim()}
                  label="Wyślij zgłoszenie"
                  className="px-5 py-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Zgłoszenia z serwera (widoczne dla całej ekipy) */}
        <div className="flex-1">
          <div className={CARD}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <p className="text-sm font-semibold text-white">Zgłoszenia z serwera</p>
              {list.length > 0 && <Badge variant="secondary">{list.length}</Badge>}
            </div>
            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Inbox className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">Brak zgłoszeń</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Opinie wysłane przez członków serwera pojawią się tutaj.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex max-h-[640px] flex-col gap-3 overflow-y-auto p-4">
                {list.map((f, i) => {
                  const meta = CAT_META[f.category];
                  const Icon = meta.icon;
                  const date = new Date(f.createdAt);
                  return (
                    <div
                      key={f.id}
                      style={{ "--i": i } as CSSProperties}
                      className={`jh-stagger group flex flex-col gap-2 rounded-lg border border-border border-l-2 ${meta.accent} bg-background/40 p-3 transition hover:bg-background`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={meta.badge}>
                          <Icon className="size-3" />
                          {meta.label}
                        </Badge>
                        {f.rating ? (
                          <span className="flex items-center gap-0.5 text-xs text-primary">
                            <Star className="h-3 w-3 fill-primary" />
                            {f.rating}/5
                          </span>
                        ) : null}
                        <span className="text-xs font-medium text-gray-300">
                          {f.username}
                        </span>
                        <span
                          className="ml-auto text-xs text-gray-400"
                          title={date.toLocaleString("pl-PL")}
                        >
                          {dayAgo(date)}
                        </span>
                        <button
                          onClick={() => setConfirmId(f.id)}
                          title="Usuń zgłoszenie"
                          className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 focus-visible:opacity-100 active:scale-90 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-gray-300">
                        {f.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel feedbacku — osobno edytor, osobno podgląd (50/50) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <PanelCard
          title="Panel feedbacku"
          description="Embed z przyciskiem „Podziel się opinią” wysyłany na kanał, by każdy mógł zgłaszać opinie z Discorda."
        >
          <ChannelField
            label="Kanał feedbacku"
            value={config.feedbackChannelId ?? ""}
            onChange={(v) =>
              setConfig((c) => ({ ...c, feedbackChannelId: v || undefined }))
            }
            channels={channels}
            onChannelsChange={setChannels}
            guildId={guildId}
            defaultName="feedback"
            placeholder="— Nie ustawiono —"
            hint={
              <>
                Tu trafiają zgłoszenia z komendy <code>/feedback</code> oraz panel z
                przyciskiem.
              </>
            }
          />

          <EmbedEditor
            value={config.feedbackPanelEmbed ?? DEFAULT_FEEDBACK_PANEL_EMBED}
            onChange={(embed) => setConfig((c) => ({ ...c, feedbackPanelEmbed: embed }))}
            variables={TICKET_VARS}
          />

          <div className="border-t border-border pt-4">
            <Button
              onClick={handleSendPanel}
              disabled={sendingPanel || !config.feedbackChannelId}
              className="w-full"
            >
              {sendingPanel ? "Publikowanie…" : "Opublikuj"}
            </Button>
            {!config.feedbackChannelId && (
              <p className="mt-2 text-xs text-gray-400">
                Najpierw ustaw kanał feedbacku powyżej i zapisz.
              </p>
            )}
          </div>
        </PanelCard>

        <EmbedPreviewCard
          embed={config.feedbackPanelEmbed ?? DEFAULT_FEEDBACK_PANEL_EMBED}
          className="lg:sticky lg:top-20"
        />
      </div>

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
