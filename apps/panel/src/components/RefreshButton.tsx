import { RotateCw } from "lucide-react";

import { cn } from "@/lib/cn";

/** Przycisk „Odśwież" z wirującą ikoną — wspólny dla list odświeżanych ręcznie. */
export function RefreshButton({
  onClick,
  loading = false,
  label = "Odśwież",
  loadingLabel = "Ładowanie…",
  className,
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg bg-background px-3 py-1.5 text-xs text-gray-300 transition hover:text-white disabled:opacity-50",
        className,
      )}
    >
      <RotateCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
      {loading ? loadingLabel : label}
    </button>
  );
}
