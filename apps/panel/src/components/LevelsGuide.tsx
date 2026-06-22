import { BarChart3, Crown, MessageSquare, Sparkles, TrendingUp } from "lucide-react";
import { memo } from "react";

import { HowItWorks, type HowItWorksCard } from "./HowItWorks";

const STEPS: HowItWorksCard[] = [
  {
    icon: MessageSquare,
    title: "Zdobywanie XP",
    text: "Za pisanie na czacie i obecność na kanałach głosowych członkowie zdobywają XP.",
  },
  {
    icon: TrendingUp,
    title: "Awans i rola",
    text: "Po przekroczeniu progu bot automatycznie nadaje przypisaną rolę.",
  },
  {
    icon: Crown,
    title: "Wyższe tiery",
    text: "Wyższy level = wyższy tier z listy; opcjonalnie powiadomienie o awansie.",
  },
  {
    icon: BarChart3,
    title: "Leaderboard",
    text: "Ranking pokazuje najaktywniejszych członków serwera w czasie rzeczywistym.",
  },
];

/** „Jak to działa?" — cztery statyczne karty-kroki systemu levelowania. */
export const LevelsGuide = memo(function LevelsGuide() {
  return (
    <HowItWorks
      icon={Sparkles}
      subtitle="Od wiadomości do rankingu w czterech krokach"
      cards={STEPS}
    />
  );
});
