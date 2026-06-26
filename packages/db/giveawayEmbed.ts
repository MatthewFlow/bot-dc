import type { EmbedConfig } from "./embed";
import type { Giveaway } from "./repositories/giveawayRepository";

const GOLD = 0xd4a843;
const GREEN = 0x57f287;
const GRAY = 0x6b7280;

/** Lista wzmianek zwycięzców lub komunikat o braku. */
function winnersLine(winners: string[]): string {
  return winners.length
    ? winners.map((id) => `<@${id}>`).join(", ")
    : "Brak uczestników — nikt nie wygrał.";
}

/**
 * Embed giveawaya zależnie od statusu — współdzielony przez API (publikacja
 * aktywnego) i bota (edycja na zakończony). Czas pokazujemy znacznikiem Discorda
 * `<t:unix:…>`, więc renderuje się w strefie czasowej każdego użytkownika.
 */
export function giveawayEmbed(g: Giveaway): EmbedConfig {
  if (g.status === "active") {
    const ends = Math.floor(g.endsAt.getTime() / 1000);
    return {
      title: `🎉 ${g.prize}`,
      description:
        "Kliknij **🎉 Dołącz** pod spodem, aby wziąć udział!\n\n" +
        `Koniec: <t:${ends}:R> (<t:${ends}:f>)\n` +
        `Zwycięzców: **${g.winnerCount}**\n` +
        `Organizator: <@${g.hostId}>`,
      color: GOLD,
    };
  }
  if (g.status === "cancelled") {
    return {
      title: `🎉 ${g.prize}`,
      description: "Giveaway został anulowany.",
      color: GRAY,
    };
  }
  return {
    title: `🎉 ${g.prize}`,
    description:
      "Giveaway zakończony!\n\n" +
      `Zwycięzcy: ${winnersLine(g.winners)}\n` +
      `Organizator: <@${g.hostId}>`,
    color: GREEN,
  };
}
