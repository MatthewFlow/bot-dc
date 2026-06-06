"use client";

import { useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved";

/** Minimalny czas pokazania „Zapisywanie…”, żeby zapis był dostrzegalny okiem. */
const MIN_SAVING_MS = 600;
/** Jak długo wisi „Zapisano ✓” po udanym zapisie. */
const SAVED_VISIBLE_MS = 1800;

/**
 * Auto-saves whenever `snapshot` changes, debounced. Captures the first value
 * after load as a baseline so freshly-loaded data is never re-saved. Pass
 * `ready = !loading` so it only arms once the page's data is in.
 *
 * Returns a `status` that pages can surface (e.g. via `<AutoSaveIndicator>`).
 * The saving state is held for at least `MIN_SAVING_MS` so a fast save is
 * still perceivable, then flips to `saved` for a short, lingering confirmation.
 */
export function useAutoSave(
  snapshot: string,
  onSave: () => void | Promise<void>,
  ready: boolean,
  delay = 900,
): { status: AutoSaveStatus } {
  const saved = useRef<string | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saved.current === null) {
      saved.current = snapshot; // baseline after initial load — no save
      return;
    }
    if (snapshot === saved.current) return;

    const timer = setTimeout(async () => {
      setStatus("saving");
      const startedAt = Date.now();
      try {
        await onSaveRef.current();
        saved.current = snapshot;
        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_SAVING_MS) {
          await new Promise((r) => setTimeout(r, MIN_SAVING_MS - elapsed));
        }
        if (!mounted.current) return;
        setStatus("saved");
        setTimeout(() => mounted.current && setStatus("idle"), SAVED_VISIBLE_MS);
      } catch {
        if (mounted.current) setStatus("idle");
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [snapshot, ready, delay]);

  return { status };
}
