"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { CornerDownLeft, LogOut, Server, ServerCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getMe, logout, queryKeys } from "@/lib/api";
import { NAV_ITEMS } from "@/lib/nav";

/**
 * Command palette (⌘K / Ctrl+K) — szybka nawigacja i akcje z klawiatury.
 * Otwierana skrótem albo zdarzeniem `jh:cmdk` (dispatch z przycisku w TopBarze).
 * Źródłem stron jest `NAV_ITEMS` (jedno źródło prawdy z nav.ts).
 */
export function CommandPalette({ guildId }: { guildId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // isOwner odblokowuje akcję „Owner panel" (ten sam klucz/cache co TopBar/overview).
  const meQ = useQuery({ queryKey: queryKeys.me(), queryFn: getMe });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("jh:cmdk", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("jh:cmdk", onOpen);
    };
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  const go = (href: string) => run(() => router.push(`/dashboard/${guildId}${href}`));

  const itemCls =
    "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none data-[selected=true]:bg-elevated data-[selected=true]:text-white";

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Wyszukiwarka poleceń"
      overlayClassName="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[14vh] z-[101] w-[92vw] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-popover"
    >
      {/* Tytuł dla czytników ekranu — Radix Dialog wymaga DialogTitle (label cmdk
          ustawia tylko aria-label na Command, nie na Content). */}
      <Dialog.Title className="sr-only">Wyszukiwarka poleceń</Dialog.Title>
      <Command.Input
        placeholder="Szukaj stron i akcji…"
        className="w-full border-b border-border bg-transparent px-4 py-3.5 text-sm text-white outline-none placeholder:text-gray-500"
      />
      <Command.List className="max-h-[60vh] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-500">
        <Command.Empty className="px-3 py-8 text-center text-sm text-gray-400">
          Brak wyników.
        </Command.Empty>

        <Command.Group heading="Strony">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Command.Item
                key={item.href || "overview"}
                value={item.label}
                keywords={[item.desc]}
                onSelect={() => go(item.href)}
                className={itemCls}
              >
                <Icon size={16} className="shrink-0 text-gray-400" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.soon && (
                  <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    wkrótce
                  </span>
                )}
              </Command.Item>
            );
          })}
        </Command.Group>

        <Command.Group heading="Akcje">
          <Command.Item
            value="Zmień serwer"
            keywords={["serwery", "lista", "switch"]}
            onSelect={() => run(() => router.push("/dashboard"))}
            className={itemCls}
          >
            <Server size={16} className="shrink-0 text-gray-400" />
            <span className="flex-1">Zmień serwer</span>
          </Command.Item>

          {meQ.data?.isOwner && (
            <Command.Item
              value="Owner panel"
              keywords={["właściciel", "admin", "wszystkie serwery"]}
              onSelect={() => run(() => router.push("/dashboard/admin"))}
              className={itemCls}
            >
              <ServerCog size={16} className="shrink-0 text-gray-400" />
              <span className="flex-1">Owner panel</span>
            </Command.Item>
          )}

          <Command.Item
            value="Wyloguj"
            keywords={["logout", "wyjdź"]}
            onSelect={() =>
              run(async () => {
                await logout();
                router.replace("/");
              })
            }
            className={itemCls}
          >
            <LogOut size={16} className="shrink-0 text-gray-400" />
            <span className="flex-1">Wyloguj</span>
          </Command.Item>
        </Command.Group>
      </Command.List>

      {/* Legenda klawiszy */}
      <div className="flex items-center justify-end gap-3 border-t border-border px-3 py-2 text-[11px] text-gray-500">
        <span className="flex items-center gap-1">
          <CornerDownLeft size={12} /> otwórz
        </span>
        <span>
          <kbd className="rounded border border-border bg-background px-1">esc</kbd>{" "}
          zamknij
        </span>
      </div>
    </Command.Dialog>
  );
}
