import { CARD } from "@/lib/cn";

import { Switch } from "./ui/switch";

/**
 * Karta głównego przełącznika sekcji (eyebrow + tytuł ze statusem + podpowiedź +
 * Switch). Wspólna dla auto-moderacji, logów serwera itp. Status koloruje się na
 * zielono/szaro wg `active`.
 */
export function MasterSwitchCard({
  eyebrow,
  title,
  active,
  activeLabel,
  inactiveLabel,
  hint,
  onChange,
}: {
  eyebrow: string;
  /** Tekst przed statusem, np. „Włącz auto-moderację — ". */
  title: string;
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  hint: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={`${CARD} flex items-center justify-between gap-4 p-6`}>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {eyebrow}
        </p>
        <p className="text-base font-semibold text-white">
          {title}
          <span className={active ? "text-green-400" : "text-gray-400"}>
            {active ? activeLabel : inactiveLabel}
          </span>
        </p>
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      </div>
      <Switch checked={active} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}
