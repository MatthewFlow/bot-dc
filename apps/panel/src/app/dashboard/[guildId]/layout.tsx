"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AccessDenied } from "@/components/AccessDenied";
import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useGuildEvents } from "@/hooks/useGuildEvents";
import { getGuilds, prefetchGuildData, TokenExpiredError } from "@/lib/api";

/** Stan bramki dostępu do serwera (zanim zamontujemy podstrony). */
type Access = "checking" | "granted" | "denied";

export default function GuildLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;
  const [guildName, setGuildName] = useState("...");
  const [guildIcon, setGuildIcon] = useState<string | null>(null);
  const [access, setAccess] = useState<Access>("checking");
  // Szuflada nawigacji na mobile — stan tu (a nie w Sidebarze), żeby hamburger w
  // TopBarze otwierał ją bez pływającego przycisku nachodzącego na treść.
  const [navOpen, setNavOpen] = useState(false);

  const granted = access === "granted";

  // Real-time (SSE) tylko po potwierdzeniu dostępu — inaczej `/events` zwróci 403.
  useGuildEvents(guildId, granted);

  useEffect(() => {
    let cancelled = false;
    setAccess("checking");

    // Lista z API zawiera WYŁĄCZNIE serwery, do których user ma dostęp (ten sam
    // warunek co bramka `guildAccessGuard`: Administrator / Zarządzanie serwerem /
    // rola admina bota). Brak na liście = brak uprawnień → ekran „brak dostępu".
    getGuilds()
      .then((guilds) => {
        if (cancelled) return;
        const guild = guilds.find((g) => g.id === guildId);
        if (!guild) {
          setAccess("denied");
          return;
        }
        setGuildName(guild.name);
        setGuildIcon(guild.icon);
        setAccess("granted");
        // Rozgrzej cache (config/role/kanały) dopiero po potwierdzeniu dostępu,
        // żeby nie strzelać zapytaniami, które i tak dostałyby 403.
        prefetchGuildData(guildId);
      })
      .catch((e) => {
        // 401 obsługuje warstwa api (redirect na "/"). Inny błąd → powrót do listy.
        if (!cancelled && !(e instanceof TokenExpiredError)) router.replace("/dashboard");
      });

    return () => {
      cancelled = true;
    };
  }, [guildId, router]);

  if (access === "denied") return <AccessDenied />;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        guildName={guildName}
        guildIcon={guildIcon}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar guildName={guildName} onMenuClick={() => setNavOpen(true)} />
        <main className="flex-1 overflow-auto">
          {granted ? (
            children
          ) : (
            // Podstron nie montujemy przed potwierdzeniem dostępu — inaczej ich własne
            // zapytania (np. /stats) odpaliłyby 403 i przekierowały zanim bramka zdąży zareagować.
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          )}
        </main>
      </div>
      {/* Command palette (⌘K) — montowana po przyznaniu dostępu (ma guildId). */}
      {granted && <CommandPalette guildId={guildId} />}
    </div>
  );
}
