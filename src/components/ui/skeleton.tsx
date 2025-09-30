import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "./card"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

// Chart Skeleton Component
function ChartSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex items-end gap-2 h-64">
        {[40, 60, 45, 70, 55, 80, 65, 50].map((height, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="flex gap-4 justify-center">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

// KPI Card Skeleton
function KPICardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-1 w-full" />
      </CardContent>
    </Card>
  )
}

// Table Row Skeleton
function TableRowSkeleton() {
  return (
    <div className="flex gap-4 py-3 border-b border-slate-200">
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

export { Skeleton, ChartSkeleton, KPICardSkeleton, TableRowSkeleton }
