"use client";

import { Crown, ServerCog, ShieldAlert, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { useAdminOverview } from "@/hooks/queries";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

/** Awatar/ikona z literką w tle, gdy brak grafiki — wspólny wygląd dla serwera i właściciela. */
function Glyph({
  src,
  alt,
  size,
  rounded,
}: {
  src: string | null;
  alt: string;
  size: number;
  rounded: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`${rounded} object-cover`}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-background text-xs font-semibold text-gray-400 ${rounded}`}
      style={{ width: size, height: size }}
    >
      {alt.charAt(0).toUpperCase()}
    </span>
  );
}

export default function AdminOverviewPage() {
  const { data, isLoading, isError, error } = useAdminOverview();

  const forbidden = isError && error instanceof Error && error.message === "Forbidden";

  return (
    <div className="jh-in mx-auto flex w-full max-w-5xl flex-col p-4 sm:p-6 lg:p-8">
      <PageHeader
        category="Owner"
        icon={ServerCog}
        title={
          <>
            Serwery <span className="italic text-primary">bota</span>
          </>
        }
        description="Zbiorczy widok wszystkich serwerów, na których działa bot — tylko dla właścicieli."
      />

      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-200">
          ← Powrót do panelu
        </Link>
      </div>

      {forbidden ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <ShieldAlert className="text-red-400" size={32} />
          <p className="text-lg font-semibold text-white">Brak dostępu</p>
          <p className="max-w-sm text-sm text-gray-400">
            Ten panel jest dostępny tylko dla właścicieli bota. Twoje konto nie jest na
            liście.
          </p>
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-gray-400">
          Nie udało się pobrać danych. Spróbuj odświeżyć stronę.
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {isLoading || !data ? (
              <>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </>
            ) : (
              <>
                <StatCard
                  icon={ServerCog}
                  label="Serwery"
                  value={data.totals.guildCount}
                />
                <StatCard
                  icon={Users}
                  label="Łącznie członków"
                  value={data.totals.memberCount.toLocaleString("pl-PL")}
                />
                <StatCard
                  icon={ShieldAlert}
                  label="Status bota"
                  value={
                    <span
                      className={
                        data.totals.botOnline ? "text-green-400" : "text-red-400"
                      }
                    >
                      {data.totals.botOnline ? "Online" : "Offline"}
                    </span>
                  }
                />
              </>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-white">Lista serwerów</h2>
              {data && (
                <span className="text-xs text-gray-400">{data.guilds.length}</span>
              )}
            </div>

            {isLoading || !data ? (
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : data.guilds.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-gray-400">
                Bot nie jest jeszcze na żadnym serwerze.
              </div>
            ) : (
              data.guilds.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
                >
                  <Glyph src={g.icon} alt={g.name} size={40} rounded="rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{g.name}</p>
                    <p className="truncate text-xs text-gray-500">{g.id}</p>
                  </div>

                  <div className="hidden items-center gap-1.5 text-sm text-gray-300 sm:flex">
                    <Users size={14} className="text-gray-500" />
                    {g.memberCount != null ? g.memberCount.toLocaleString("pl-PL") : "—"}
                  </div>

                  <div className="flex w-28 shrink-0 items-center justify-end gap-2 sm:w-40">
                    {g.owner ? (
                      <>
                        <Glyph
                          src={g.owner.avatar}
                          alt={g.owner.name}
                          size={24}
                          rounded="rounded-full"
                        />
                        <span className="flex items-center gap-1 truncate text-xs text-gray-300">
                          <Crown size={12} className="shrink-0 text-amber-400" />
                          <span className="truncate">{g.owner.name}</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">— nieznany —</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
