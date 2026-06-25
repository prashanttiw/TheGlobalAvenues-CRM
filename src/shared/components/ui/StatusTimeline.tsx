import * as React from "react"
import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "../../../lib/utils"

export interface TimelineEntry {
  status: string
  label: string
  date?: string
  actor?: string
  completed: boolean
  isCurrent?: boolean
}

interface StatusTimelineProps {
  entries: TimelineEntry[]
  className?: string
}

export function StatusTimeline({ entries, className }: StatusTimelineProps) {
  return (
    <div className={cn("flow-root", className)}>
      <ul className="-mb-8">
        {entries.map((entry, idx) => (
          <li key={idx}>
            <div className="relative pb-8">
              {idx !== entries.length - 1 ? (
                <span
                  className={cn(
                    "absolute top-4 left-4 -ml-px h-full w-0.5",
                    entry.completed 
                      ? "bg-brand-orange-accessible" 
                      : "border-l-2 border-dashed border-border-warm"
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white",
                      entry.isCurrent
                        ? "bg-brand-orange-accessible text-white shadow-card"
                        : entry.completed
                        ? "bg-brand-orange-accessible/10 text-brand-orange-accessible"
                        : "bg-surface-warm text-muted-foreground border border-border-warm"
                    )}
                  >
                    {entry.isCurrent || entry.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className={cn(
                      "text-sm font-semibold",
                      entry.isCurrent ? "text-brand-orange-accessible font-bold" : "text-brand-navy"
                    )}>
                      {entry.label}
                    </p>
                    {entry.actor && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        By {entry.actor}
                      </p>
                    )}
                  </div>
                  {entry.date && (
                    <div className="text-right text-xs whitespace-nowrap text-muted-foreground">
                      <time dateTime={entry.date}>{entry.date}</time>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
