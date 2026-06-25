import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "../../../lib/utils"
import { Card, CardContent } from "./Card"
import { SkeletonText } from "./SkeletonLoader"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  change?: string
  changePct?: number
  icon: LucideIcon
  color?: 'orange' | 'green' | 'amber' | 'navy'
  isLoading?: boolean
}

export function StatCard({
  label,
  value,
  change,
  changePct,
  icon: Icon,
  color = 'navy',
  isLoading = false,
  className,
  ...props
}: StatCardProps) {
  const colorMap = {
    orange: {
      bg: 'bg-brand-orange-accessible/10',
      text: 'text-brand-orange-accessible',
    },
    green: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
    },
    amber: {
      bg: 'bg-brand-amber/10',
      text: 'text-brand-amber',
    },
    navy: {
      bg: 'bg-brand-navy/10',
      text: 'text-brand-navy',
    },
  }[color]

  return (
    <Card className={cn("hover:shadow-card-hover transition-shadow", className)} {...props}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", colorMap.bg, colorMap.text)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <SkeletonText lines={1} className="h-8 w-24" />
          ) : (
            <div className="text-3xl font-bold font-display text-brand-navy">
              {value}
            </div>
          )}

          {!isLoading && (change || changePct !== undefined) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {changePct !== undefined && (
                <span className={cn(
                  "font-bold",
                  changePct >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {changePct >= 0 ? "↑" : "↓"} {Math.abs(changePct)}%
                </span>
              )}
              {change && <span className="text-muted-foreground">{change}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
