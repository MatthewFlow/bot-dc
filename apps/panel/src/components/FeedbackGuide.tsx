import { Bell, LayoutGrid, MessageSquare, Sparkles, Star } from "lucide-react";

import { HowItWorks, type HowItWorksCard } from "./HowItWorks";

const STEPS: HowItWorksCard[] = [
  {
    icon: LayoutGrid,
    title: "Wybierz kategorię",
    text: "Błąd, sugestia lub inne — żeby ekipa wiedziała, czego dotyczy zgłoszenie.",
  },
  {
    icon: Star,
    title: "Dodaj ocenę",
    text: "Oceń w gwiazdkach (1–5) — pomaga priorytetyzować zgłoszenia.",
  },
  {
    icon: MessageSquare,
    title: "Opisz i wyślij",
    text: "Napisz spostrzeżenie i kliknij „Wyślij zgłoszenie”.",
  },
  {
    icon: Bell,
    title: "Śledź zgłoszenia",
    text: "Obok widzisz wszystkie opinie z serwera — sortuj, oznaczaj i zarządzaj.",
  },
];

/** „Jak to działa?" — cztery statyczne karty-kroki (informacyjne, bez progresji). */
export function FeedbackGuide() {
  return (
    <HowItWorks
      icon={Sparkles}
      subtitle="Cztery proste kroki do wysłania opinii"
      cards={STEPS}
    />
  );
}
