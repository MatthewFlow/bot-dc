import { Bell, CheckCircle2, Send, Sparkles, Ticket } from "lucide-react";
import { memo } from "react";

import { HowItWorks, type HowItWorksCard } from "./HowItWorks";

const STEPS: HowItWorksCard[] = [
  {
    icon: Send,
    title: "Ustaw i opublikuj",
    text: "Wskaż rolę obsługi i wyślij panel na kanał (lub użyj /ticket_setup).",
  },
  {
    icon: Ticket,
    title: "Użytkownik zgłasza",
    text: "Klika „Złóż ticket” i opisuje sprawę — powstaje prywatny wątek.",
  },
  {
    icon: Bell,
    title: "Ekipa przejmuje",
    text: "Obsługa dostaje ping i przejmuje zgłoszenie przyciskiem „Przejmij”.",
  },
  {
    icon: CheckCircle2,
    title: "Zamknij i śledź",
    text: "/ticket_close kończy wątek; tu masz podgląd statusów i historię.",
  },
];

/** „Jak to działa?" — cztery statyczne karty-kroki systemu ticketów. */
export const TicketsGuide = memo(function TicketsGuide() {
  return (
    <HowItWorks
      icon={Sparkles}
      subtitle="Cztery kroki do obsługi zgłoszeń"
      cards={STEPS}
    />
  );
});
