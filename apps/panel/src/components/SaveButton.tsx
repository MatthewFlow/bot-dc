"use client";

import { useState } from "react";

import type { AutoSaveStatus } from "@/hooks/useAutoSave";

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
    <button
      onClick={handleClick}
      disabled={saving || disabled}
      className={`cursor-pointer rounded-lg text-sm font-semibold text-black transition disabled:cursor-not-allowed ${
        saved ? "bg-green-500" : "bg-[#d4a843] hover:bg-[#c49b3a]"
      } disabled:opacity-60 ${className}`}
    >
      {saving ? "Zapisywanie…" : saved ? "Zapisano ✓" : label}
    </button>
  );
}
