"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <Button
        variant="secondary"
        onClick={() => {
          setName(defaultName);
          setOpen(true);
        }}
        className="h-auto shrink-0 px-3 py-2.5 font-normal text-gray-300"
        title="Utwórz nowy kanał przez bota"
      >
        + Stwórz kanał
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="nazwa-kanału"
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
