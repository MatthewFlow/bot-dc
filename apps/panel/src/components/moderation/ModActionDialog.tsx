"use client";

import { useState } from "react";

import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  banUser,
  kickUser,
  type MemberSearchResult,
  muteUser,
  warnUser,
} from "@/lib/api";

import {
  BAN_DURATIONS,
  MUTE_DURATIONS,
  PUNISH_META,
  type PunishKind,
} from "./actionMeta";
import { MemberLookup } from "./MemberLookup";

const FIELD_LABEL = "mb-1.5 block text-xs font-medium text-gray-300";

export function ModActionDialog({
  guildId,
  kind,
  presetMember,
  onClose,
  onDone,
}: {
  guildId: string;
  kind: PunishKind;
  presetMember?: MemberSearchResult | null;
  onClose: () => void;
  /** Wywoływane po udanej akcji — strona odświeża statystyki i listy. */
  onDone: () => void;
}) {
  const toast = useToast();
  const meta = PUNISH_META[kind];

  const [member, setMember] = useState<MemberSearchResult | null>(presetMember ?? null);
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState(MUTE_DURATIONS[2]?.minutes ?? 10);
  const [deleteDays, setDeleteDays] = useState(0);
  const [banMinutes, setBanMinutes] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!member) return;
    setSubmitting(true);
    const trimmed = reason.trim() || undefined;
    try {
      if (kind === "warn") {
        const r = await warnUser(guildId, member.userId, trimmed);
        toast(
          r.autoBanned
            ? "Ostrzeżenie dodane — próg przekroczony, użytkownik zbanowany."
            : `Ostrzeżenie dodane (#${r.warnCount}).`,
          "success",
        );
      } else if (kind === "mute") {
        await muteUser(guildId, member.userId, minutes, trimmed);
        toast("Użytkownik wyciszony.", "success");
      } else if (kind === "kick") {
        await kickUser(guildId, member.userId, trimmed);
        toast("Użytkownik wyrzucony.", "success");
      } else {
        await banUser(
          guildId,
          member.userId,
          trimmed,
          deleteDays,
          banMinutes || undefined,
        );
        toast(
          banMinutes ? "Użytkownik zbanowany tymczasowo." : "Użytkownik zbanowany.",
          "success",
        );
      }
      onDone();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Akcja nie powiodła się.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.iconCls}`}
            >
              <meta.icon className="size-4" />
            </span>
            {meta.label}
          </DialogTitle>
          <DialogDescription>
            Akcja zapisze się w dzienniku i — jeśli włączono — wyśle DM do użytkownika.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className={FIELD_LABEL}>Użytkownik</label>
            <MemberLookup
              guildId={guildId}
              value={member}
              onSelect={setMember}
              autoFocus={!presetMember}
            />
          </div>

          {meta.needsDuration && (
            <div>
              <label className={FIELD_LABEL}>Czas wyciszenia</label>
              <select
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-full rounded-lg bg-background px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
              >
                {MUTE_DURATIONS.map((d) => (
                  <option key={d.minutes} value={d.minutes}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {kind === "ban" && (
            <div>
              <label className={FIELD_LABEL}>Czas bana</label>
              <select
                value={banMinutes}
                onChange={(e) => setBanMinutes(Number(e.target.value))}
                className="w-full rounded-lg bg-background px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
              >
                {BAN_DURATIONS.map((d) => (
                  <option key={d.minutes} value={d.minutes}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {meta.needsDeleteDays && (
            <div>
              <label className={FIELD_LABEL}>Usuń wiadomości z ostatnich</label>
              <select
                value={deleteDays}
                onChange={(e) => setDeleteDays(Number(e.target.value))}
                className="w-full rounded-lg bg-background px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
              >
                {[0, 1, 7].map((d) => (
                  <option key={d} value={d}>
                    {d === 0 ? "Nie usuwaj" : d === 1 ? "1 dzień" : "7 dni"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={FIELD_LABEL}>Powód (opcjonalnie)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="np. Spam na #ogólny"
              maxLength={512}
              onKeyDown={(e) =>
                e.key === "Enter" && member && !submitting && handleSubmit()
              }
            />
          </div>
        </div>

        <DialogFooter className="mt-1">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Anuluj
          </Button>
          <Button
            variant={meta.destructive ? "destructive" : "default"}
            onClick={handleSubmit}
            disabled={!member || submitting}
          >
            {submitting ? "Wykonuję…" : meta.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
