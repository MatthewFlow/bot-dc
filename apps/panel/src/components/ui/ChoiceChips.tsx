import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/**
 * Rząd „pigułek" wyboru (zawijany), aktywna wypełniona kolorem marki — wspólny dla
 * wyboru akcji automod i reakcji na raid. `size="sm"` daje ciaśniejszy wariant.
 */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const Icon = o.icon;
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-center gap-2 rounded-lg transition",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              active
                ? "bg-primary font-semibold text-primary-foreground"
                : "border border-border bg-background text-gray-300 hover:text-white",
            )}
          >
            {Icon && <Icon className="size-4" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
