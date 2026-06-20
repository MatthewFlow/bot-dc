"use client";

import { ChannelSelect } from "@/components/ChannelSelect";
import { RoleSelect } from "@/components/RoleSelect";
import type { Channel, Role } from "@/lib/api";

const CHIP =
  "flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs text-gray-300 transition hover:text-red-400";

/**
 * Para list wyjątków: pomijane role + pomijane kanały (select + usuwalne chipy).
 * Współdzielona przez Auto-moderację i Logi serwera — jedno źródło prawdy dla tego UI.
 */
export function ExemptLists({
  roles,
  channels,
  roleIds,
  channelIds,
  onRoleIdsChange,
  onChannelIdsChange,
}: {
  roles: Role[];
  channels: Channel[];
  roleIds: string[];
  channelIds: string[];
  onRoleIdsChange: (ids: string[]) => void;
  onChannelIdsChange: (ids: string[]) => void;
}) {
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <label className="mb-1 block text-xs text-gray-400">Pomijane role</label>
        <RoleSelect
          value=""
          onChange={(v) => v && !roleIds.includes(v) && onRoleIdsChange([...roleIds, v])}
          roles={roles.filter((r) => !roleIds.includes(r.id))}
          placeholder="+ Dodaj rolę"
          className="w-full px-3 py-2"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {roleIds.map((id) => (
            <button
              key={id}
              onClick={() => onRoleIdsChange(roleIds.filter((x) => x !== id))}
              className={CHIP}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {roleName(id)} ✕
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-gray-400">Pomijane kanały</label>
        <ChannelSelect
          value=""
          onChange={(v) =>
            v && !channelIds.includes(v) && onChannelIdsChange([...channelIds, v])
          }
          channels={channels.filter((c) => !channelIds.includes(c.id))}
          placeholder="+ Dodaj kanał"
          className="w-full px-3 py-2"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {channelIds.map((id) => (
            <button
              key={id}
              onClick={() => onChannelIdsChange(channelIds.filter((x) => x !== id))}
              className={CHIP}
            >
              #{channelName(id)} ✕
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
