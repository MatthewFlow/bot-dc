import type { LucideIcon } from "lucide-react";

import { Switch } from "@/components/ui/switch";

/**
 * Wiersz przełącznika: label + opcjonalny opis + Switch. Z `icon` renderuje też
 * kolorowy kafelek ikony po lewej (jak kategorie logów); bez ikony to prosty
 * wiersz (jak filtry automod / opcje levelowania). Jedno źródło dla wszystkich
 * lokalnych `Toggle`/`CategoryToggle`/`LvToggle`.
 */
export function ToggleRow({
  icon: Icon,
  iconCls,
  label,
  desc,
  checked,
  onChange,
}: {
  icon?: LucideIcon;
  iconCls?: string;
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconCls ?? ""}`}
          >
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm text-white">{label}</p>
          {desc && <p className="text-xs text-gray-400">{desc}</p>}
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className={Icon ? "mt-1" : "mt-0.5"}
      />
    </div>
  );
}
