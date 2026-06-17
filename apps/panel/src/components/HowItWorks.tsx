import { Lightbulb, type LucideIcon } from "lucide-react";

export interface HowItWorksCard {
  icon: LucideIcon;
  title: string;
  text: string;
}

interface HowItWorksProps {
  /** Wariant banerowy — zwięzłe kroki z numerowanymi kółkami. */
  steps?: string[];
  /** Wariant kartowy — kafelki z ikoną i dużym numerem w tle (jak Command Center). */
  cards?: HowItWorksCard[];
  title?: string;
  /** Podtytuł pod nagłówkiem (tylko wariant kartowy). */
  subtitle?: string;
  className?: string;
}

/**
 * Baner „Jak to działa?". Domyślnie kompaktowe kroki w siatce; gdy podasz `cards`,
 * renderuje bogatszy układ kafelków (ikona + numer w tle + opis).
 */
export function HowItWorks({
  steps,
  cards,
  title = "Jak to działa?",
  subtitle,
  className = "",
}: HowItWorksProps) {
  if (cards) {
    // Styl spójny z FeedbackGuide / WelcomeGuide — ten sam język wizualny kart-kroków.
    return (
      <div
        className={`surface-raised rounded-xl border border-border bg-card p-5 ${className}`}
      >
        <div className="mb-5 flex items-center gap-2">
          <Lightbulb size={16} className="mt-0.5 shrink-0 self-start text-primary" />
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => {
            const Icon = card.icon;
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
                <p className="text-sm font-semibold text-white">{card.title}</p>
                <p className="mt-1 text-xs leading-snug text-gray-400">{card.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div
      className={`surface-raised rounded-xl border border-border bg-card p-5 ${className}`}
    >
      <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        <Lightbulb size={16} className="shrink-0 text-primary" />
        {title}
      </p>
      <ol className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {(steps ?? []).map((text, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <p className="text-sm leading-snug text-gray-300">{text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
