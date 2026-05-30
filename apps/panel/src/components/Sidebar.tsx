"use client";

import { useParams, usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "", icon: "⊞" },
  { label: "Welcome / Goodbye", href: "/welcome", icon: "👋" },
  { label: "Auto-role", href: "/autorole", icon: "🎭" },
  { label: "Reaction Roles", href: "/reaction-roles", icon: "⚡" },
  { label: "Levelowanie", href: "/levels", icon: "📈" },
];

export function Sidebar({ guildName }: { guildName: string }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const guildId = params.guildId as string;

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-white/5 bg-[#0d1117]">
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1f2e] text-sm font-bold text-[#d4a843]">
          JH
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{guildName}</p>
          <p className="text-xs text-gray-500">Discord Bot</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
          Zarządzanie
        </p>
        {navItems.map((item) => {
          const href = `/dashboard/${guildId}${item.href}`;
          const isActive = item.href === ""
            ? pathname === `/dashboard/${guildId}`
            : pathname.startsWith(href);

          return (
            <button
              key={item.href}
              onClick={() => router.push(href)}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-[#1a1f2e] text-[#d4a843]"
                  : "text-gray-400 hover:bg-[#1a1f2e] hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/5 px-4 py-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-xs text-gray-600 hover:text-gray-400"
        >
          ← Zmień serwer
        </button>
      </div>
    </aside>
  );
}