"use client";

import { Star } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { HowItWorks } from "@/components/HowItWorks";
import { PageHeader } from "@/components/PageHeader";
import { SaveButton } from "@/components/SaveButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/toast";
import { useGuildLoad } from "@/hooks/useGuildLoad";
import type { Feedback, FeedbackCategory } from "@/lib/api";
import { getMyFeedback, submitFeedback } from "@/lib/api";

const CARD = "rounded-xl border border-white/5 bg-[#1a1f2e]";

const CATEGORIES: { value: FeedbackCategory; label: string; cls: string }[] = [
  { value: "bug", label: "🐛 Błąd", cls: "text-red-400 bg-red-400/10" },
  { value: "suggestion", label: "💡 Sugestia", cls: "text-[#d4a843] bg-[#d4a843]/10" },
  { value: "other", label: "💬 Inne", cls: "text-gray-300 bg-white/10" },
];

const CAT_META: Record<FeedbackCategory, { label: string; cls: string }> = {
  bug: { label: "Błąd", cls: "text-red-400 bg-red-400/10" },
  suggestion: { label: "Sugestia", cls: "text-[#d4a843] bg-[#d4a843]/10" },
  other: { label: "Inne", cls: "text-gray-300 bg-white/10" },
};

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
            Podziel się <span className="italic text-[#d4a843]">opinią</span>
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
            <p className="border-b border-white/5 px-6 py-4 text-sm font-semibold text-white">
              Nowe zgłoszenie
            </p>
            <div className="flex flex-col gap-5 p-6">
              {/* Kategoria */}
              <div>
                <label className="mb-2 block text-xs text-gray-500">Kategoria</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        category === cat.value
                          ? "bg-[#d4a843] text-black"
                          : "bg-[#0f1117] text-gray-400 hover:text-white"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ocena (opcjonalna) */}
              <div>
                <label className="mb-2 block text-xs text-gray-500">
                  Ocena <span className="text-gray-600">(opcjonalnie)</span>
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n === rating ? 0 : n)}
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      className="p-0.5 text-gray-600 transition"
                      aria-label={`Ocena ${n}`}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          n <= (hover || rating)
                            ? "fill-[#d4a843] text-[#d4a843]"
                            : "text-gray-600"
                        }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-xs text-gray-500">{rating}/5</span>
                  )}
                </div>
              </div>

              {/* Treść */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">Treść</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder="Opisz swoje spostrzeżenie, pomysł lub problem…"
                  className="w-full resize-y rounded-lg bg-[#0f1117] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
                />
                <p className="mt-1 text-right text-xs text-gray-600">
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

          {/* Moje zgłoszenia */}
          <div className={`${CARD} mt-6`}>
            <p className="border-b border-white/5 px-6 py-4 text-sm font-semibold text-white">
              Twoje zgłoszenia{" "}
              <span className="text-xs font-normal text-gray-500">({mine.length})</span>
            </p>
            {mine.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-500">
                Nie wysłano jeszcze żadnego zgłoszenia.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {mine.map((f) => {
                  const meta = CAT_META[f.category];
                  return (
                    <div key={f.id} className="flex flex-col gap-1.5 px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                        {f.rating ? (
                          <span className="flex items-center gap-0.5 text-xs text-[#d4a843]">
                            <Star className="h-3 w-3 fill-[#d4a843]" />
                            {f.rating}/5
                          </span>
                        ) : null}
                        <span className="ml-auto text-xs text-gray-600">
                          {new Date(f.createdAt).toLocaleString("pl-PL")}
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
