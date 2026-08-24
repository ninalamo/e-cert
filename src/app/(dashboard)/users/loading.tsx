import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="app-card divide-y divide-[var(--color-border)] overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
