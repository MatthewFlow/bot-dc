"use client";

import { CreateEntityButton } from "@/components/CreateEntityButton";
import type { Role } from "@/lib/api";
import { createRole } from "@/lib/api";

/** Tworzy nową rolę przez bota i zwraca ją przez onCreated. */
export function CreateRoleButton({
  guildId,
  defaultName = "",
  onCreated,
}: {
  guildId: string;
  defaultName?: string;
  onCreated: (role: Role) => void;
}) {
  return (
    <CreateEntityButton<Role>
      defaultName={defaultName}
      create={(name) => createRole(guildId, name)}
      onCreated={onCreated}
      openLabel="+ Stwórz rolę"
      inputName="newRoleName"
      inputAriaLabel="Nazwa nowej roli"
      inputPlaceholder="nazwa-roli"
      successMessage={(r) => `Utworzono rolę @${r.name}`}
      errorMessage="Nie udało się utworzyć roli. Sprawdź uprawnienia bota."
      title="Utwórz nową rolę przez bota"
    />
  );
}
