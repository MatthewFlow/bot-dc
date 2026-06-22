import { cn } from "@/lib/cn";

/**
 * Kompaktowy input liczbowy (wyśrodkowany, `w-20`) — wspólny styl dla pól typu
 * „N wiadomości / T sekund" w automod i moderacji. `onChange` dostaje już liczbę
 * (`Number(value)`); ewentualny clamp robi call-site, by nie psuć wpisywania.
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  name,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  name?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <input
      type="number"
      name={name}
      aria-label={ariaLabel}
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        "w-20 rounded-lg bg-background px-2 py-1.5 text-center text-sm text-white outline-none focus:ring-2 focus:ring-primary",
        className,
      )}
    />
  );
}
