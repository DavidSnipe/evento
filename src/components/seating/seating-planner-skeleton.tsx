import { Skeleton } from "@/components/ui/skeleton";

export function SeatingPlannerSkeleton() {
  return (
    <div className="flex min-h-[70vh] flex-col gap-4 animate-pulse">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-4">
        <Skeleton className="hidden h-full w-56 shrink-0 lg:block" />
        <Skeleton className="min-h-[60vh] flex-1 rounded-xl" />
      </div>
    </div>
  );
}
