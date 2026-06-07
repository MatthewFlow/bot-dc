"use client";

import { ChevronDown } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { prefetchGuildData } from "@/lib/api";
import { NAV_GROUPS, NAV_OVERVIEW, type NavItem } from "@/lib/nav";

const COLLAPSED_KEY = "jh_nav_collapsed";

export function Sidebar({ guildName }: { guildName: string }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const guildId = params.guildId as string;
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Wczytaj zapamiętany stan zwiniętych sekcji.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      if (raw) setCollapsed(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  function toggleGroup(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  function isItemActive(item: NavItem) {
    const href = `/dashboard/${guildId}${item.href}`;
    return item.href === ""
      ? pathname === `/dashboard/${guildId}`
      : pathname.startsWith(href);
  }

  function NavButton({ item }: { item: NavItem }) {
    const href = `/dashboard/${guildId}${item.href}`;
    const isActive = isItemActive(item);
    const Icon = item.icon;

    return (
      <button
        onClick={() => navigate(href)}
        onMouseEnter={() => {
          router.prefetch(href); // JS trasy
          prefetchGuildData(guildId); // dane (jeśli cache wygasł)
        }}
        className={`relative mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843]/40 ${
          isActive
            ? "bg-[#1a1f2e] text-[#d4a843]"
            : "text-gray-400 hover:bg-[#1a1f2e] hover:text-white"
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#d4a843]" />
        )}
        <Icon size={18} className="shrink-0" />
        <span>{item.label}</span>
      </button>
    );
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1f2e] text-sm font-bold text-[#d4a843]">
          JH
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{guildName}</p>
          <p className="text-xs text-gray-500">Discord Bot</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {/* Dashboard — poza grupami */}
        <NavButton item={NAV_OVERVIEW} />

        {NAV_GROUPS.map((group) => {
          const isCollapsed = collapsed.has(group.id);
          const GroupIcon = group.icon;
          return (
            <div key={group.id} className="mt-4">
              <button
                onClick={() => toggleGroup(group.id)}
                className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-400 outline-none focus-visible:text-gray-400"
              >
                <GroupIcon size={13} className="shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                />
              </button>
              {!isCollapsed &&
                group.items.map((item) => <NavButton key={item.href} item={item} />)}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-4 py-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-xs text-gray-600 hover:text-gray-400"
        >
          ← Zmień serwer
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-56 flex-col border-r border-white/5 bg-[#0d1117]">
        {navContent}
      </aside>

      {/* Mobile — hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a1f2e] text-white md:hidden"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile — overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile — drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-56 flex-col border-r border-white/5 bg-[#0d1117] transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 text-gray-500 hover:text-white"
        >
          ✕
        </button>
        {navContent}
      </aside>
    </>
  );
}
