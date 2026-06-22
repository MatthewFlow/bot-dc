import {
  Bell,
  CheckCircle2,
  type LucideIcon,
  Send,
  Sparkles,
  Ticket,
} from "lucide-react";
import { memo } from "react";

import { CARD } from "@/lib/cn";

const STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Send,
    title: "Ustaw i opublikuj",
    desc: "Wskaż rolę obsługi i wyślij panel na kanał (lub użyj /ticket_setup).",
  },
  {
    icon: Ticket,
    title: "Użytkownik zgłasza",
    desc: "Klika „Złóż ticket” i opisuje sprawę — powstaje prywatny wątek.",
  },
  {
    icon: Bell,
    title: "Ekipa przejmuje",
    desc: "Obsługa dostaje ping i przejmuje zgłoszenie przyciskiem „Przejmij”.",
  },
  {
    icon: CheckCircle2,
    title: "Zamknij i śledź",
    desc: "/ticket_close kończy wątek; tu masz podgląd statusów i historię.",
  },
];

/**
 * „Jak to działa?" — cztery statyczne karty-kroki systemu ticketów (mirror
 * `WelcomeGuide`). `memo`, bo nie ma propsów — interakcje obok nie powinny
 * re-renderować tej sekcji.
 */
export const TicketsGuide = memo(function TicketsGuide() {
  return (
    <div className={`${CARD} p-5`}>
      <div className="mb-5 flex items-center gap-2">
        <Sparkles size={16} className="mt-0.5 shrink-0 self-start text-primary" />
        <div>
          <p className="text-sm font-semibold text-white">Jak to działa?</p>
          <p className="text-xs text-gray-400">Cztery kroki do obsługi zgłoszeń</p>
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
});
