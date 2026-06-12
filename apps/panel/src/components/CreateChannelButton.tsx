"use client";

import { CreateEntityButton } from "@/components/CreateEntityButton";
import type { Channel } from "@/lib/api";
import { createChannel } from "@/lib/api";

/** Tworzy nowy kanał tekstowy przez bota i zwraca go przez onCreated. */
export function CreateChannelButton({
  guildId,
  defaultName = "",
  onCreated,
}: {
  guildId: string;
  defaultName?: string;
  onCreated: (channel: Channel) => void;
}) {
  return (
    <CreateEntityButton<Channel>
      defaultName={defaultName}
      create={(name) => createChannel(guildId, name)}
      onCreated={onCreated}
      openLabel="+ Stwórz kanał"
      inputName="newChannelName"
      inputAriaLabel="Nazwa nowego kanału"
      inputPlaceholder="nazwa-kanału"
      successMessage={(ch) => `Utworzono kanał #${ch.name}`}
      errorMessage="Nie udało się utworzyć kanału. Sprawdź uprawnienia bota."
      title="Utwórz nowy kanał przez bota"
    />
  );
}
