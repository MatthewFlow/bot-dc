"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Role } from "@/lib/api";
import { createRole } from "@/lib/api";

interface CreateRoleButtonProps {
  guildId: string;
  defaultName?: string;
  onCreated: (role: Role) => void;
}

/**
 * Tworzy nową rolę przez bota i zwraca ją przez onCreated.
 * Pokazuje inline input z nazwą zamiast natychmiastowego tworzenia.
 */
export function CreateRoleButton({
  guildId,
  defaultName = "",
  onCreated,
}: CreateRoleButtonProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const role = await createRole(guildId, trimmed);
      onCreated(role);
      toast(`Utworzono rolę @${role.name}`, "success");
      setOpen(false);
    } catch {
      toast("Nie udało się utworzyć roli. Sprawdź uprawnienia bota.", "error");
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
        title="Utwórz nową rolę przez bota"
      >
        + Stwórz rolę
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Input
        autoFocus
        name="newRoleName"
        aria-label="Nazwa nowej roli"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="nazwa-roli"
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
