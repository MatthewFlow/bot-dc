import { Lightbulb } from "lucide-react";

interface HowItWorksProps {
  steps: string[];
  title?: string;
  className?: string;
}

/**
 * Baner „Jak to działa?" — kroki w responsywnej siatce (1/2/4 kolumny).
 * Domyślnie ląduje u góry lewej kolumny strony, nad kontrolkami.
 */
export function HowItWorks({
  steps,
  title = "Jak to działa?",
  className = "",
}: HowItWorksProps) {
  return (
    <div
      className={`surface-raised rounded-xl border border-border bg-card p-5 ${className}`}
    >
      <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        <Lightbulb size={16} className="shrink-0 text-primary" />
        {title}
      </p>
      <ol className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((text, i) => (
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
