import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Nagłówek karty: ikona + tytuł + opcjonalny podtytuł, z miejscem na akcję po prawej
 * (np. SaveButton). Wspólny wygląd sekcji na stronach moderacyjnych.
 */
export function CardHead({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
