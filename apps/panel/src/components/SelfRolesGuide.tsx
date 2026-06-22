import { MousePointerClick, Palette, Send, Sparkles, SquareStack } from "lucide-react";
import { memo } from "react";

import { HowItWorks, type HowItWorksCard } from "./HowItWorks";

const STEPS: HowItWorksCard[] = [
  {
    icon: MousePointerClick,
    title: "Wybierz typ",
    text: "Przyciski (klik nadaje/zdejmuje rolę) albo Reakcje (emoji nadaje rolę).",
  },
  {
    icon: Palette,
    title: "Zbuduj embed",
    text: "Ustaw tytuł, opis i kolor, potem dodaj pozycje: rola + etykieta lub emoji.",
  },
  {
    icon: Send,
    title: "Opublikuj",
    text: "Kliknij Opublikuj — bot wyśle gotową wiadomość na wybrany kanał.",
  },
  {
    icon: SquareStack,
    title: "Zarządzaj",
    text: "Wszystkie opublikowane wiadomości — obu typów — edytujesz niżej.",
  },
];

/** „Jak to działa?" — cztery statyczne karty-kroki konfiguracji self-roles. */
export const SelfRolesGuide = memo(function SelfRolesGuide() {
  return (
    <HowItWorks
      icon={Sparkles}
      subtitle="Cztery kroki do ról na klik lub reakcję"
      cards={STEPS}
    />
  );
});
