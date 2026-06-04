import type { EmbedConfig } from "@jurassic-haven/db";

const ID_FIELDS = new Set([
  "welcomeChannelId",
  "goodbyeChannelId",
  "levelUpChannelId",
  "joinRoleId",
  "verifiedRoleId",
  "modLogChannelId",
  "adminRoleId",
  "ticketSupportRoleId",
  "ticketSupportRoleId2",
  "ticketLogChannelId",
]);
const TEXT_FIELDS: Record<string, number> = {
  welcomeMessage: 2000,
  goodbyeMessage: 2000,
};
const EMBED_FIELDS = new Set(["welcomeEmbed", "goodbyeEmbed", "ticketPanelEmbed"]);

function clampStr(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

/** URL fields may hold a real http(s) URL or a `{variable}` placeholder. */
function urlOrTemplate(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  if (s.includes("{") || /^https?:\/\//i.test(s)) return s.slice(0, 2048);
  return undefined;
}

function sanitizeEmbed(v: unknown): EmbedConfig | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const out: EmbedConfig = {};

  out.title = clampStr(o.title, 256);
  out.description = clampStr(o.description, 4096);
  if (typeof o.color === "number" && Number.isFinite(o.color)) {
    out.color = Math.max(0, Math.min(0xffffff, Math.floor(o.color)));
  }
  out.url = urlOrTemplate(o.url);
  out.authorName = clampStr(o.authorName, 256);
  out.authorIconUrl = urlOrTemplate(o.authorIconUrl);
  out.thumbnailUrl = urlOrTemplate(o.thumbnailUrl);
  out.imageUrl = urlOrTemplate(o.imageUrl);
  out.footerText = clampStr(o.footerText, 2048);
  out.footerIconUrl = urlOrTemplate(o.footerIconUrl);
  out.timestamp = o.timestamp === true;

  if (Array.isArray(o.fields)) {
    const fields = o.fields
      .slice(0, 25)
      .map((f) => {
        const fo = (f ?? {}) as Record<string, unknown>;
        return {
          name: clampStr(fo.name, 256) ?? "",
          value: clampStr(fo.value, 1024) ?? "",
          inline: fo.inline === true,
        };
      })
      .filter((f) => f.name && f.value);
    if (fields.length) out.fields = fields;
  }

  return out;
}

function sanitizeRoleRewards(v: unknown): Array<{ level: number; roleId: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 100)
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return { level: Number(o.level), roleId: o.roleId };
    })
    .filter(
      (r): r is { level: number; roleId: string } =>
        Number.isInteger(r.level) &&
        r.level >= 1 &&
        typeof r.roleId === "string" &&
        r.roleId.length > 0 &&
        r.roleId.length <= 32,
    );
}

function sanitizeButton(v: unknown): { label?: string; emoji?: string } | null | undefined {
  if (v === null) return null;
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  return { label: clampStr(o.label, 80), emoji: clampStr(o.emoji, 64) };
}

/**
 * Validates and clamps an allowlisted config patch before it reaches the DB.
 * `null` clears a field; malformed values are dropped rather than stored raw.
 */
export function sanitizeConfigPatch(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      out[key] = null; // explicit clear
      continue;
    }
    if (ID_FIELDS.has(key)) {
      if (typeof value === "string" && value.length <= 32) out[key] = value;
    } else if (key in TEXT_FIELDS) {
      const s = clampStr(value, TEXT_FIELDS[key] ?? 2000);
      if (s !== undefined) out[key] = s;
    } else if (EMBED_FIELDS.has(key)) {
      const e = sanitizeEmbed(value);
      if (e) out[key] = e;
    } else if (key === "roleRewards") {
      out[key] = sanitizeRoleRewards(value);
    } else if (key === "ticketPanelButton") {
      const b = sanitizeButton(value);
      if (b !== undefined) out[key] = b;
    }
  }

  return out;
}
