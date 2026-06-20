"use client";

import { useEffect, useState } from "react";

/** Zwraca `value` z opóźnieniem — kolejne zmiany resetują licznik (debounce). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
