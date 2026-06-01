"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { TokenExpiredError } from "@/lib/api";

export function useGuildLoad<T>(
  guildId: string,
  loader: (guildId: string) => Promise<T>,
  onData: (data: T) => void,
  errorRedirect = "/dashboard",
): { loading: boolean } {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  const onDataRef = useRef(onData);
  loaderRef.current = loader;
  onDataRef.current = onData;

  useEffect(() => {
    loaderRef.current(guildId)
      .then((data) => onDataRef.current(data))
      .catch((e) => {
        // TokenExpiredError already triggers window.location.href = "/" in api.ts
        if (!(e instanceof TokenExpiredError)) router.replace(errorRedirect);
      })
      .finally(() => setLoading(false));
  }, [guildId, router, errorRedirect]);

  return { loading };
}
