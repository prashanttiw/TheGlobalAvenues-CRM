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
    <div className={cn("flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border-warm rounded-card bg-surface-warm/30", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange-accessible/10 mb-4 shadow-sm">
        <Icon className="h-8 w-8 text-brand-orange-accessible" />
      </div>
      <h3 className="font-display text-lg font-semibold text-brand-navy">{heading}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
