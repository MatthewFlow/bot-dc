import type { ReactNode } from "react";

import { EmbedPreview } from "@/components/EmbedPreview";
import { PanelCard } from "@/components/PanelCard";
import type { EmbedConfig } from "@/lib/api";

/**
 * Karta „Podgląd" z podglądem embeda w stylu Discorda — wspólny wygląd dla welcome,
 * ticketów, levels, feedbacku itd. `children` pozwala dorzucić treść pod podglądem
 * (np. listę dostępnych zmiennych). Zmiany wyglądu podglądu robisz tutaj.
 */
export function EmbedPreviewCard({
  embed,
  replace,
  buttonLabel,
  buttonEmoji,
  className = "",
  children,
}: {
  embed: EmbedConfig;
  replace?: (s: string) => string;
  buttonLabel?: string;
  buttonEmoji?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <PanelCard title="Podgląd" bodyClassName="p-6" className={className}>
      <EmbedPreview
        embed={embed}
        replace={replace}
        buttonLabel={buttonLabel}
        buttonEmoji={buttonEmoji}
      />
      {children}
    </PanelCard>
  );
}
