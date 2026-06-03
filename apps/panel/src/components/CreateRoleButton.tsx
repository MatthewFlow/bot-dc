"use client";

import { useState } from "react";

import { useToast } from "@/components/toast";
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
      <button
        onClick={() => {
          setName(defaultName);
          setOpen(true);
        }}
        className="shrink-0 rounded-lg bg-[#0f1117] px-3 py-2.5 text-sm text-gray-400 transition hover:text-white"
        title="Utwórz nową rolę przez bota"
      >
        + Stwórz rolę
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="nazwa-roli"
        className="w-40 rounded-lg bg-[#0f1117] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
      />
      <button
        onClick={submit}
        disabled={busy || !name.trim()}
        className="shrink-0 rounded-lg bg-[#d4a843] px-3 py-2.5 text-sm font-semibold text-black transition hover:bg-[#c49b3a] disabled:opacity-40"
      >
        {busy ? "…" : "Utwórz"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="shrink-0 text-gray-500 hover:text-gray-300"
        title="Anuluj"
      >
        ✕
      </button>
    </div>
  );
}
