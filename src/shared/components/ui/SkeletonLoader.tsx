import * as React from "react"
import { cn } from "../../../lib/utils"
import { Card, CardContent, CardHeader } from "./Card"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted-foreground/15", className)}
      {...props}
    />
  )
}

export function SkeletonCard() {
  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[100px] w-full" />
      </CardContent>
    </Card>
  )
}

export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex w-full items-center justify-between space-x-4 p-4 border-b border-border-warm">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === 0 ? "w-[30%]" : "w-[15%]")} />
      ))}
    </div>
  )
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} 
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClass = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16"
  }[size]

  return <Skeleton className={cn("rounded-full", sizeClass, className)} />
}

export { Skeleton }
