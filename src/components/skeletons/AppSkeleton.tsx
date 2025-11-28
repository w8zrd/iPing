import { Skeleton } from "@/components/ui/Skeleton"

export function AppSkeleton() {
  return (
    <div className="min-h-screen pb-32 bg-background">
      {/* Header Skeleton */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-safe">
        <div className="glass-strong border-b mx-4 mt-4 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between px-6 py-4">
            <Skeleton className="h-8 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Content Skeleton */}
      <div className="max-w-2xl mx-auto p-4 pt-24 space-y-4">
        <div className="glass rounded-3xl p-6 shadow-md">
           <div className="space-y-4">
             <div className="flex items-center gap-4">
               <Skeleton className="h-12 w-12 rounded-full" />
               <div className="space-y-2">
                 <Skeleton className="h-4 w-[200px]" />
                 <Skeleton className="h-4 w-[150px]" />
               </div>
             </div>
             <Skeleton className="h-24 w-full" />
           </div>
        </div>
        <div className="glass rounded-3xl p-6 shadow-md">
           <Skeleton className="h-32 w-full" />
        </div>
      </div>

      {/* Navigation Skeleton */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="glass-strong border-t mx-4 mb-4 rounded-3xl shadow-lg">
          <div className="flex justify-around items-center h-16 px-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-full" />
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}