import { DoorClosed, DoorOpen, RefreshCw, Sparkles, Zap } from "lucide-react";
import { memo } from "react";

import { HowItWorks, type HowItWorksCard } from "./HowItWorks";

const STEPS: HowItWorksCard[] = [
  {
    icon: DoorOpen,
    title: "Wybierz kanał",
    text: "Wskaż kanał powitań i napisz treść — prosty tekst albo bogaty embed.",
  },
  {
    icon: Zap,
    title: "Wstaw zmienne",
    text: "Użyj {user}, {server}, {member_count}, {avatar}, by spersonalizować wiadomość.",
  },
  {
    icon: DoorClosed,
    title: "Skonfiguruj Goodbye",
    text: "Zakładka pożegnań działa tak samo — wysyła się przy wyjściu z serwera.",
  },
  {
    icon: RefreshCw,
    title: "Zapisz i gotowe",
    text: "Zmiany zapisują się automatycznie — bot reaguje od razu, bez restartu.",
  },
];

/** „Jak to działa?" — cztery statyczne karty-kroki konfiguracji powitań. */
export const WelcomeGuide = memo(function WelcomeGuide() {
  return (
    <HowItWorks
      icon={Sparkles}
      subtitle="Cztery kroki do skonfigurowania powitań"
      cards={STEPS}
    />
  );
});
