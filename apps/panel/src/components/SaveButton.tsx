"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { AutoSaveStatus } from "@/hooks/useAutoSave";
import { cn } from "@/lib/cn";

interface SaveButtonProps {
  onClick: () => void | Promise<void>;
  /** Optional external override (legacy) — internal state is used otherwise. */
  saving?: boolean;
  saved?: boolean;
  /** Auto-save status — reflected in the button so a debounced save is visible. */
  autoSaveStatus?: AutoSaveStatus;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function SaveButton({
  onClick,
  saving: extSaving,
  saved: extSaved,
  autoSaveStatus,
  disabled = false,
  className = "",
  label = "Zapisz zmiany",
}: SaveButtonProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function handleClick() {
    if (status === "saving") return;
    setStatus("saving");
    try {
      await onClick();
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("idle");
    }
  }

  const saving = extSaving || status === "saving" || autoSaveStatus === "saving";
  const saved = extSaved || status === "saved" || autoSaveStatus === "saved";

  return (
    <Button
      onClick={handleClick}
      disabled={saving || disabled}
      className={cn(
        "h-auto disabled:opacity-60",
        saved && "bg-success text-black hover:bg-success",
        className,
      )}
    >
      {saving ? "Zapisywanie…" : saved ? "Zapisano ✓" : label}
    </Button>
  );
}
