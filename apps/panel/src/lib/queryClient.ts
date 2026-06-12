import { QueryClient } from "@tanstack/react-query";

/**
 * Singleton QueryClient — współdzielony przez `QueryClientProvider` (komponenty,
 * hooki `useQuery`/`useMutation`) ORAZ przez warstwę `api.ts` (fetchery przez
 * `queryClient.fetchQuery`). Dzięki temu jeden magazyn cache obsługuje oba światy:
 * to samo zapytanie wywołane z fetchera i z hooka trafia w ten sam klucz.
 *
 * Panel jest w całości client-side (auth przez cookie/localStorage, fetch w
 * `useEffect`), więc modułowy singleton jest bezpieczny — nie ma SSR per-request.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // config/role/kanały rzadko się zmieniają — 5 min „świeżości".
      staleTime: 300_000,
      gcTime: 600_000,
      // 429 obsługuje fetchWithRetry (z retry_after) w api.ts — bez podwójnych prób.
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});
