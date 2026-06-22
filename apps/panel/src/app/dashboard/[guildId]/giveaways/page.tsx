"use client";

import { Gift, Sparkles, Timer, Trophy } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { CARD } from "@/lib/cn";

const PREVIEW = [
  {
    icon: Sparkles,
    title: "Twórz w panelu",
    text: "Nagroda, czas trwania, liczba zwycięzców i wymagana rola.",
  },
  {
    icon: Timer,
    title: "Bot prowadzi",
    text: "Odlicza czas, zbiera uczestników i sam losuje zwycięzców.",
  },
  {
    icon: Trophy,
    title: "Wyniki w panelu",
    text: "Podgląd uczestników i zwycięzców, reroll jednym kliknięciem.",
  },
];

export default function GiveawaysPage() {
  return (
    <div className="jh-in flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Społeczność"
        icon={Gift}
        title={
          <>
            Give<span className="italic text-primary">awaye</span>
          </>
        }
        description="Konkursy z losowaniem nagród — wkrótce."
        className="mb-0"
      />

      {/* Komunikat „wkrótce" */}
      <div className={`${CARD} p-10 text-center`}>
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Gift className="size-7" />
        </span>
        <span className="inline-block rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Wkrótce
        </span>
        <h2 className="mt-3 text-xl font-bold text-white">
          Giveawaye są w przygotowaniu
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
          Ta funkcja jeszcze nie jest dostępna. Pracujemy nad nią — zajrzyj tu niedługo.
        </p>
      </div>

      {/* Wyszarzony podgląd tego, co będzie */}
      <div className="pointer-events-none select-none opacity-50">
        <div className="grid gap-4 sm:grid-cols-3">
          {PREVIEW.map((p) => (
            <div key={p.title} className={`${CARD} p-5`}>
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-gray-300">
                <p.icon className="size-5" />
              </span>
              <p className="text-sm font-semibold text-white">{p.title}</p>
              <p className="mt-1 text-xs text-gray-400">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
