export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />;
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-6 py-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-4 w-12" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-card p-6 space-y-3">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl bg-card">
      <div className="border-b border-border px-6 py-4">
        <Skeleton className="h-4 w-32" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-border last:border-0">
          <SkeletonRow />
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="rounded-xl bg-card p-6 space-y-4">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-3">
        <div>
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
