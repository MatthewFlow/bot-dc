"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

function AuthSuccessInner() {
  const router = useRouter();

  useEffect(() => {
    // Cookie jh_token is HttpOnly — set automatically by the API.
    // Just redirect to dashboard; all subsequent API calls use credentials:include.
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
