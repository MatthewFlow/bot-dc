import {
  DoorClosed,
  DoorOpen,
  type LucideIcon,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { memo } from "react";

import { CARD } from "@/lib/cn";

const STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: DoorOpen,
    title: "Wybierz kanał",
    desc: "Wskaż kanał powitań i napisz treść — prosty tekst albo bogaty embed.",
  },
  {
    icon: Zap,
    title: "Wstaw zmienne",
    desc: "Użyj {user}, {server}, {member_count}, {avatar}, by spersonalizować wiadomość.",
  },
  {
    icon: DoorClosed,
    title: "Skonfiguruj Goodbye",
    desc: "Zakładka pożegnań działa tak samo — wysyła się przy wyjściu z serwera.",
  },
  {
    icon: RefreshCw,
    title: "Zapisz i gotowe",
    desc: "Zmiany zapisują się automatycznie — bot reaguje od razu, bez restartu.",
  },
];

/**
 * „Jak to działa?" — cztery statyczne karty-kroki konfiguracji powitań (mirror
 * `FeedbackGuide`). `memo`, bo nie ma propsów — typowanie w formularzu obok nie
 * powinno re-renderować tej sekcji.
 */
export const WelcomeGuide = memo(function WelcomeGuide() {
  return (
    <div className={`${CARD} p-5`}>
      <div className="mb-5 flex items-center gap-2">
        <Sparkles size={16} className="mt-0.5 shrink-0 self-start text-primary" />
        <div>
          <p className="text-sm font-semibold text-white">Jak to działa?</p>
          <p className="text-xs text-gray-400">Cztery kroki do skonfigurowania powitań</p>
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
