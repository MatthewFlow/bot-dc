// Publiczna powierzchnia warstwy API panelu. Implementacja podzielona na moduły
// domenowe w `lib/api/*` (rdzeń fetch + cache, typy, auth, guilds, self-roles,
// moderacja, joby/serwer gry, feedback, status). Ten barrel zachowuje jeden
// import — `@/lib/api` — więc miejsca użycia pozostają bez zmian.
export * from "./api/admin";
export * from "./api/auth";
export * from "./api/core";
export * from "./api/feedback";
export * from "./api/guilds";
export * from "./api/jobs";
export * from "./api/moderation";
export * from "./api/selfRoles";
export * from "./api/status";
export * from "./api/types";
