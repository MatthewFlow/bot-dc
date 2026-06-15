import { Sparkles, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { memo } from "react";

/**
 * Karta „Wskazówki" — nagłówek z ikoną + lista porad z punktorami (Zap). Wspólny
 * wygląd dla kolumny podglądu (self-roles itd.). `memo`, bo `items` to zwykle stała.
 */
export const TipsCard = memo(function TipsCard({
  items,
  title = "Wskazówki",
  className = "",
}: {
  items: ReactNode[];
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={`surface-raised rounded-xl border border-border bg-card p-5 ${className}`}
    >
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Sparkles size={16} className="shrink-0 text-primary" />
        {title}
      </p>
      <ul className="flex flex-col gap-2.5 text-xs leading-snug text-gray-300">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <Zap className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});
