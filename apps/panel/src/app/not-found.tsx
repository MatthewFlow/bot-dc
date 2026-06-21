"use client";

import { ChevronLeft, LayoutGrid, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      {/* Ciepła poświata marki (złoto) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[120px]"
      />

      <div className="jh-in flex flex-col items-center">
        <span className="jh-glow mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Search className="size-9" />
        </span>

        <h1 className="bg-gradient-to-b from-primary to-primary-hover bg-clip-text text-8xl font-black leading-none text-transparent sm:text-9xl">
          404
        </h1>

        <h2 className="mt-8 text-2xl font-bold text-white sm:text-3xl">
          Ta strona wymarła 🦖
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-gray-400 sm:text-base">
          Nie znaleźliśmy tego, czego szukasz. Może moduł został przeniesiony, albo link
          jest nieaktualny.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/dashboard">
              <LayoutGrid /> Wróć do dashboardu
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.back()}>
            <ChevronLeft /> Cofnij
          </Button>
        </div>
      </div>
    </div>
  );
}
