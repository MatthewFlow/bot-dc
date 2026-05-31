"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

function AuthSuccessInner() {
  const router = useRouter();

  useEffect(() => {
    // Odczytaj token z cookie ustawionego przez API
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("jh_token="))
      ?.split("=")[1];

    if (!token) {
      console.error("[auth] No token in cookie");
      router.replace("/");
      return;
    }

    // Przenieś token z cookie do localStorage
    localStorage.setItem("jh_token", token);

    // Usuń cookie
    document.cookie = "jh_token=; path=/; max-age=0";

    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-gray-400">Logging in...</p>
    </main>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-gray-400">Logging in...</p>
        </main>
      }
    >
      <AuthSuccessInner />
    </Suspense>
  );
}
