"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { TokenExpiredError } from "@/lib/api";

/**
 * Wywołuje `seed(data)` dokładnie RAZ — gdy dane po raz pierwszy są dostępne.
 * Strony edycyjne trzymają edytowalny draft seedowany z zapytania; bez tego
 * guardu refetch w tle (np. po zapisie) nadpisałby wpisywane przez użytkownika
 * zmiany. Odtwarza „seed-once" semantykę dawnego useGuildLoad.
 */
export function useSeedOnce<T>(data: T | undefined, seed: (data: T) => void): void {
  const done = useRef(false);
  const seedRef = useRef(seed);
  seedRef.current = seed;

  useEffect(() => {
    if (!done.current && data !== undefined) {
      done.current = true;
      seedRef.current(data);
    }
  }, [data]);
}

/**
 * Przekierowuje przy błędzie zapytania (np. brak dostępu do serwera) — tak jak
 * robił useGuildLoad. 401/wygaśnięcie tokenu obsługuje już warstwa api (redirect
 * na "/"), więc TokenExpiredError jest tu pomijany.
 */
export function useRedirectOnError(
  isError: boolean,
  error: unknown,
  to = "/dashboard",
): void {
  const router = useRouter();
  useEffect(() => {
    if (isError && !(error instanceof TokenExpiredError)) router.replace(to);
  }, [isError, error, router, to]);
}
