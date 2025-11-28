import { Skeleton } from "@/components/ui/Skeleton"

export function FeedSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass rounded-3xl p-6 shadow-md">
          <div className="flex items-start gap-3 mb-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="mt-4 flex gap-4">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}