import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { cn } from '../../../lib/utils'

export interface ActionItem {
  label: string
  icon?: LucideIcon
  onClick: () => void
  hidden?: boolean
  variant?: 'default' | 'danger'
}

interface InlineActionsProps {
  actions: ActionItem[]
}

export function InlineActions({ actions }: InlineActionsProps) {
  const visibleActions = actions.filter(a => !a.hidden)

  if (visibleActions.length === 0) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-navy">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className="z-50 min-w-[160px] overflow-hidden rounded-md border border-border-warm bg-surface-card p-1 shadow-card animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1">
          {visibleActions.map((action, idx) => (
            <DropdownMenu.Item
              key={idx}
              onClick={action.onClick}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                action.variant === 'danger' 
                  ? "text-red-600 focus:bg-red-50 focus:text-red-700" 
                  : "text-brand-navy focus:bg-brand-orange-accessible/10 focus:text-brand-orange-accessible"
              )}
            >
              {action.icon ? <action.icon className="mr-2 h-4 w-4" /> : null}
              {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
