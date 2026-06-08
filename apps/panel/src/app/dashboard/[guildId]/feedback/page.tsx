"use client";

import {
  Bug,
  Inbox,
  Lightbulb,
  type LucideIcon,
  MessageCircle,
  Star,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { Feedback, FeedbackCategory } from "@/lib/api";
import { getMyFeedback, submitFeedback } from "@/lib/api";

const CARD = "surface-raised rounded-xl border border-border bg-card";

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

/** Względny czas po polsku (dziś / wczoraj / N dni temu / data). */
function timeAgo(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "dziś";
  if (days === 1) return "wczoraj";
  if (days < 7) return `${days} dni temu`;
  return date.toLocaleDateString("pl-PL");
}

function FeedbackSkeleton() {
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

export default function FeedbackPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const toast = useToast();

  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState<Feedback[]>([]);

  const { loading } = useGuildLoad(
    guildId,
    () => getMyFeedback(),
    (list) => setMine(list),
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
      setMine((prev) => [created, ...prev]);
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

  if (loading) return <FeedbackSkeleton />;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Twoja opinia"
        title={
          <>
            Podziel się <span className="italic text-primary">opinią</span>
          </>
        }
        description="Zgłoś błąd, zaproponuj funkcję lub po prostu napisz, co myślisz."
        className="mb-0"
      />

      <HowItWorks
        steps={[
          "Wybierz kategorię: błąd, sugestia lub inne.",
          "Opcjonalnie dodaj ocenę w gwiazdkach (1–5).",
          "Opisz swoje spostrzeżenie i kliknij Wyślij.",
          "Twoje zgłoszenia zobaczysz na liście poniżej formularza.",
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
                <label className="mb-1 block text-xs text-gray-400">Treść</label>
                <textarea
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

        {/* Moje zgłoszenia */}
        <div className="flex-1">
          <div className={CARD}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <p className="text-sm font-semibold text-white">Twoje zgłoszenia</p>
              {mine.length > 0 && <Badge variant="secondary">{mine.length}</Badge>}
            </div>
            {mine.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Inbox className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">Brak zgłoszeń</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Twoje wysłane opinie pojawią się tutaj.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4">
                {mine.map((f) => {
                  const meta = CAT_META[f.category];
                  const Icon = meta.icon;
                  const date = new Date(f.createdAt);
                  return (
                    <div
                      key={f.id}
                      className={`flex flex-col gap-2 rounded-lg border border-border border-l-2 ${meta.accent} bg-background/40 p-3 transition hover:bg-background`}
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
                        <span
                          className="ml-auto text-xs text-gray-400"
                          title={date.toLocaleString("pl-PL")}
                        >
                          {timeAgo(date)}
                        </span>
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
    </div>
  );
}
