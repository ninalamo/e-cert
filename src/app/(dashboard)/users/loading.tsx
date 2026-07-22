import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="app-card p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-1 py-2.5">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
