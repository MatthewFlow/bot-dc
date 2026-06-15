import { Zap } from "lucide-react";
import { memo } from "react";

/**
 * Karta „Dostępne zmienne" — nagłówek z ikoną + wiersze (pigułka z nazwą zmiennej
 * + opis). Wariant kartowy listy zmiennych dla kolumny podglądu. `memo`, bo `items`
 * jest stałą modułową — sekcja nie zależy od stanu formularza.
 */
export const VariablesCard = memo(function VariablesCard({
  items,
  title = "Dostępne zmienne",
  className = "",
}: {
  items: { label: string; desc: string }[];
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={`surface-raised rounded-xl border border-border bg-card p-5 ${className}`}
    >
      <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        <Zap size={16} className="shrink-0 text-primary" />
        {title}
      </p>
      <div className="flex flex-col gap-2.5">
        {items.map((v) => (
          <div key={v.label} className="flex items-center gap-3">
            <span className="shrink-0 rounded bg-primary/10 px-2 py-1 font-mono text-xs text-primary">
              {v.label}
            </span>
            <span className="text-xs leading-snug text-gray-300">{v.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
