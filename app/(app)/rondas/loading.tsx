import { Skeleton } from "@/components/ui/skeleton";

export default function RondasLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-7 w-40" />

      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="rounded-lg border border-slate-800">
        <div className="divide-y divide-slate-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="ml-auto h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
