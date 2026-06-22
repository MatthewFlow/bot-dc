import {
  Bell,
  LayoutGrid,
  type LucideIcon,
  MessageSquare,
  Sparkles,
  Star,
} from "lucide-react";

import { CARD } from "@/lib/cn";

const STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: LayoutGrid,
    title: "Wybierz kategorię",
    desc: "Błąd, sugestia lub inne — żeby ekipa wiedziała, czego dotyczy zgłoszenie.",
  },
  {
    icon: Star,
    title: "Dodaj ocenę",
    desc: "Oceń w gwiazdkach (1–5) — pomaga priorytetyzować zgłoszenia.",
  },
  {
    icon: MessageSquare,
    title: "Opisz i wyślij",
    desc: "Napisz spostrzeżenie i kliknij „Wyślij zgłoszenie”.",
  },
  {
    icon: Bell,
    title: "Śledź zgłoszenia",
    desc: "Obok widzisz wszystkie opinie z serwera — sortuj, oznaczaj i zarządzaj.",
  },
];

/** „Jak to działa?" — cztery statyczne karty-kroki (informacyjne, bez progresji). */
export function FeedbackGuide() {
  return (
    <div className={`${CARD} p-5`}>
      <div className="mb-5 flex items-center gap-2">
        <Sparkles size={16} className="mt-0.5 shrink-0 self-start text-primary" />
        <div>
          <p className="text-sm font-semibold text-white">Jak to działa?</p>
          <p className="text-xs text-gray-400">Cztery proste kroki do wysłania opinii</p>
        </div>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li
              key={i}
              className="surface-raised relative overflow-hidden rounded-xl border border-border bg-background/40 p-4"
            >
              <span className="pointer-events-none absolute -top-1 right-2 text-6xl font-black text-white/[0.04] select-none">
                {i + 1}
              </span>
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <p className="text-sm font-semibold text-white">{s.title}</p>
              <p className="mt-1 text-xs leading-snug text-gray-400">{s.desc}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
