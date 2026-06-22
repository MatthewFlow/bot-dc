import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/**
 * Segmentowany przełącznik (równe szerokości w kontenerze `bg-background p-1`) —
 * wspólny dla zakładek typu Welcome/Goodbye i trybu wysyłki ogłoszeń. Aktywny
 * segment ma wypełnienie marki; reszta jest przygaszona.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 rounded-lg bg-background p-1", className)}>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition",
              value === o.value
                ? "bg-primary text-primary-foreground"
                : "text-gray-300 hover:text-white",
            )}
          >
            {Icon && <Icon size={15} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
