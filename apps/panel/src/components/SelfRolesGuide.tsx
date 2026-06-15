import {
  type LucideIcon,
  MousePointerClick,
  Palette,
  Send,
  Sparkles,
  SquareStack,
} from "lucide-react";
import { memo } from "react";

const STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: MousePointerClick,
    title: "Wybierz typ",
    desc: "Przyciski (klik nadaje/zdejmuje rolę) albo Reakcje (emoji nadaje rolę).",
  },
  {
    icon: Palette,
    title: "Zbuduj embed",
    desc: "Ustaw tytuł, opis i kolor, potem dodaj pozycje: rola + etykieta lub emoji.",
  },
  {
    icon: Send,
    title: "Opublikuj",
    desc: "Kliknij Opublikuj — bot wyśle gotową wiadomość na wybrany kanał.",
  },
  {
    icon: SquareStack,
    title: "Zarządzaj",
    desc: "Wszystkie opublikowane wiadomości — obu typów — edytujesz niżej.",
  },
];

/**
 * „Jak to działa?" — cztery statyczne karty-kroki konfiguracji self-roles (mirror
 * `WelcomeGuide`). `memo`, bo nie ma propsów — interakcje w builderze obok nie
 * powinny re-renderować tej sekcji.
 */
export const SelfRolesGuide = memo(function SelfRolesGuide() {
  return (
    <div className="surface-raised rounded-xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles size={16} className="mt-0.5 shrink-0 self-start text-primary" />
        <div>
          <p className="text-sm font-semibold text-white">Jak to działa?</p>
          <p className="text-xs text-gray-400">Cztery kroki do ról na klik lub reakcję</p>
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
