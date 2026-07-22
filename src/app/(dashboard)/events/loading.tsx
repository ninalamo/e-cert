import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="flex items-center justify-end">
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-18 rounded-full" />
        </div>
      </div>
      <div className="app-card divide-y divide-[var(--color-border)] overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/5" />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
