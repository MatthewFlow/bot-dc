import {
  BarChart3,
  Crown,
  type LucideIcon,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { memo } from "react";

const STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: MessageSquare,
    title: "Zdobywanie XP",
    desc: "Za pisanie na czacie i obecność na kanałach głosowych członkowie zdobywają XP.",
  },
  {
    icon: TrendingUp,
    title: "Awans i rola",
    desc: "Po przekroczeniu progu bot automatycznie nadaje przypisaną rolę.",
  },
  {
    icon: Crown,
    title: "Wyższe tiery",
    desc: "Wyższy level = wyższy tier z listy; opcjonalnie powiadomienie o awansie.",
  },
  {
    icon: BarChart3,
    title: "Leaderboard",
    desc: "Ranking pokazuje najaktywniejszych członków serwera w czasie rzeczywistym.",
  },
];

/**
 * „Jak to działa?" — cztery statyczne karty-kroki systemu levelowania (mirror
 * `TicketsGuide`/`WelcomeGuide`). `memo`, bo nie ma propsów — interakcje obok nie
 * powinny re-renderować tej sekcji.
 */
export const LevelsGuide = memo(function LevelsGuide() {
  return (
    <div className="surface-raised rounded-xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles size={16} className="mt-0.5 shrink-0 self-start text-primary" />
        <div>
          <p className="text-sm font-semibold text-white">Jak to działa?</p>
          <p className="text-xs text-gray-400">
            Od wiadomości do rankingu w czterech krokach
          </p>
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
