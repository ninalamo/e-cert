import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="app-card p-4 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="app-card p-4 space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}
