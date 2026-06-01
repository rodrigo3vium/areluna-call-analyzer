import { Skeleton } from "@/components/ui/skeleton";

export default function CallsLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-7 w-36" />

      <div className="flex gap-2 border-b border-slate-800 pb-0">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="rounded-lg border border-slate-800">
        <div className="divide-y divide-slate-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
