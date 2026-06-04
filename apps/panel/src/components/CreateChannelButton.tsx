"use client";

import { useState } from "react";

import { useToast } from "@/components/toast";
import type { Channel } from "@/lib/api";
import { createChannel } from "@/lib/api";

interface CreateChannelButtonProps {
  guildId: string;
  defaultName?: string;
  onCreated: (channel: Channel) => void;
}

/**
 * Tworzy nowy kanał tekstowy przez bota i zwraca go przez onCreated.
 * Pokazuje inline input z nazwą zamiast natychmiastowego tworzenia.
 */
export function CreateChannelButton({
  guildId,
  defaultName = "",
  onCreated,
}: CreateChannelButtonProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const channel = await createChannel(guildId, trimmed);
      onCreated(channel);
      toast(`Utworzono kanał #${channel.name}`, "success");
      setOpen(false);
    } catch {
      toast("Nie udało się utworzyć kanału. Sprawdź uprawnienia bota.", "error");
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
        title="Utwórz nowy kanał przez bota"
      >
        + Stwórz kanał
      </button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="nazwa-kanału"
        className="min-w-0 flex-1 rounded-lg bg-[#0f1117] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#d4a843]"
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
