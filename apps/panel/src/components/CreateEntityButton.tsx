"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Inline „utwórz encję" (kanał/rola): przycisk → input z nazwą → utworzenie przez
 * bota. Wspólny rdzeń pod CreateChannelButton/CreateRoleButton — różnią się tylko
 * akcją tworzącą i tekstami.
 */
export function CreateEntityButton<T extends { name: string }>({
  defaultName = "",
  create,
  onCreated,
  openLabel,
  inputName,
  inputAriaLabel,
  inputPlaceholder,
  successMessage,
  errorMessage,
  title,
}: {
  defaultName?: string;
  create: (name: string) => Promise<T>;
  onCreated: (entity: T) => void;
  /** Tekst przycisku otwierającego (np. „+ Stwórz kanał"). */
  openLabel: string;
  inputName: string;
  inputAriaLabel: string;
  inputPlaceholder: string;
  successMessage: (entity: T) => string;
  errorMessage: string;
  title: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const entity = await create(trimmed);
      onCreated(entity);
      toast(successMessage(entity), "success");
      setOpen(false);
    } catch {
      toast(errorMessage, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="secondary"
        onClick={() => {
          setName(defaultName);
          setOpen(true);
        }}
        className="h-auto shrink-0 px-3 py-2.5 font-normal text-gray-300"
        title={title}
      >
        {openLabel}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Input
        autoFocus
        name={inputName}
        aria-label={inputAriaLabel}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={inputPlaceholder}
        className="min-w-0 flex-1 py-2.5"
      />
      <Button
        onClick={submit}
        disabled={busy || !name.trim()}
        className="h-auto shrink-0 px-3 py-2.5"
      >
        {busy ? "…" : "Utwórz"}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(false)}
        className="shrink-0"
        title="Anuluj"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
