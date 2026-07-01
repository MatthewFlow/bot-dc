import type { Messages } from "./pl";

/** Słownik EN — typowany na `Messages`, więc musi mieć dokładnie te same klucze
 *  co PL (brak/nadmiar = błąd kompilacji). */
export const en: Messages = {
  common: {
    soon: "soon",
    search: "Search…",
    searchPages: "Search pages and actions…",
    noResults: "No results.",
    logout: "Log out",
    changeServer: "Change server",
    discordBot: "Discord Bot",
  },
  topbar: {
    openMenu: "Open menu",
    closeMenu: "Close menu",
    ownerPanel: "Owner panel — all bot servers",
    searchHint: "Search and navigate (Ctrl/⌘ K)",
    searchAria: "Open command palette",
    logout: "Log out",
  },
  lang: {
    label: "Language",
    pl: "Polski",
    en: "English",
  },
  palette: {
    label: "Command palette",
    pages: "Pages",
    actions: "Actions",
    ownerPanel: "Owner panel",
    open: "open",
    close: "close",
  },
  nav: {
    groups: {
      onboarding: "Onboarding",
      community: "Community",
      security: "Security",
      system: "System",
    },
    items: {
      overview: { label: "Dashboard", desc: "Server overview" },
      feedback: { label: "Feedback", desc: "Share your thoughts and suggestions" },
      welcome: { label: "Welcome / Goodbye", desc: "Welcome channels and messages" },
      autorole: { label: "Auto-role", desc: "Role granted on join" },
      roles: {
        label: "Self-Roles",
        desc: "Roles members can pick themselves (buttons / reactions)",
      },
      levels: { label: "Leveling", desc: "XP, levels and rewards system" },
      tickets: { label: "Tickets", desc: "Handle user support requests" },
      announce: { label: "Announcements", desc: "Send or schedule an embed message" },
      sticky: { label: "Sticky", desc: "Pinned message kept at the bottom of a channel" },
      autovoice: {
        label: "Voice channels",
        desc: "Auto channels: joining creates a personal voice channel",
      },
      translation: {
        label: "Translation",
        desc: "Auto-translate messages from a tracked channel",
      },
      giveaways: { label: "Giveaways", desc: "Contests with prize draws" },
      moderation: { label: "Moderation", desc: "Warnings, bans, action logs" },
      automod: { label: "Auto-moderation", desc: "Spam, link and word filters" },
      serverlog: { label: "Server logs", desc: "Message, join and role logs" },
      commands: { label: "Commands", desc: "Enable and disable bot commands" },
      settings: { label: "Settings", desc: "Admin role and mod-log channel" },
      gameserver: {
        label: "Game server",
        desc: "Manage The Isle: Evrima server (RCON)",
      },
    },
  },
};
