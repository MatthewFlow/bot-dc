"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { TokenExpiredError } from "@/lib/api";

/**
 * Wywołuje `seed(data)` dokładnie RAZ — gdy dane po raz pierwszy są dostępne.
 * Strony edycyjne trzymają edytowalny draft seedowany z zapytania; bez tego
 * guardu refetch w tle (np. po zapisie) nadpisałby wpisywane przez użytkownika
 * zmiany. Odtwarza „seed-once" semantykę dawnego useGuildLoad.
 *
 * Zwraca `true`, gdy draft został już zaseedowany. Auto-zapis musi czekać na tę
 * flagę (nie na samo `!isLoading`): przy danych z cache zapytanie nie jest
 * „loading", ale lokalny draft jest jeszcze pusty — uzbrojenie autozapisu w tym
 * oknie złapałoby pusty baseline i zapisałoby zaraz po seedzie mimo braku zmian.
 */
export function useSeedOnce<T>(data: T | undefined, seed: (data: T) => void): boolean {
  const done = useRef(false);
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!done.current && data !== undefined) {
      done.current = true;
      seedRef.current(data);
      setSeeded(true);
    }
  }, [data]);

  return seeded;
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
