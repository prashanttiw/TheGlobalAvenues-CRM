import * as React from 'react'
import { Inbox, LucideIcon } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  heading: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon = Inbox, heading, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-card border border-dashed border-border-warm bg-surface-card/80 p-8 text-center shadow-sm", className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-brand-orange-accessible/15 bg-brand-orange-accessible/10 shadow-sm">
        <Icon className="h-7 w-7 text-brand-orange-accessible" />
      </div>
      <h3 className="font-display text-base font-semibold text-brand-navy sm:text-lg">{heading}</h3>
      <p className="mb-6 mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  )
}
