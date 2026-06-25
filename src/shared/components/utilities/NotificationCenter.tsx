import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Bell, Check, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../../lib/utils'

export interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  read: boolean
}

// Dummy data
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: '1', title: 'Application Updated', description: 'Your application to University of Toronto was moved to Under Review.', time: '10m ago', read: false },
  { id: '2', title: 'Document Required', description: 'Please upload your recent IELTS scores.', time: '2h ago', read: false },
  { id: '3', title: 'Payment Confirmed', description: 'Your tuition deposit of $500 has been received.', time: '1d ago', read: true },
]

export function NotificationCenter() {
  const [notifications, setNotifications] = React.useState(MOCK_NOTIFICATIONS)
  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative text-brand-navy" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-orange-accessible ring-2 ring-white" />
          )}
        </Button>
      </PopoverPrimitive.Trigger>
      
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content 
          align="end" 
          sideOffset={8}
          className="z-50 w-80 rounded-card border border-border-warm bg-surface-card p-0 shadow-card animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        >
          <div className="flex items-center justify-between border-b border-border-warm px-4 py-3">
            <h4 className="font-semibold font-display text-brand-navy">Notifications</h4>
            {unreadCount > 0 && (
              <span className="rounded-full bg-brand-orange-accessible/10 px-2 py-0.5 text-xs font-medium text-brand-orange-accessible">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                You're all caught up!
              </div>
            ) : (
              <ul className="divide-y divide-border-warm">
                {notifications.map(notif => (
                  <li key={notif.id} className={cn("p-4 transition-colors hover:bg-surface-warm/50", !notif.read && "bg-brand-orange-accessible/5")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <p className={cn("text-sm font-medium leading-none", !notif.read ? "text-brand-navy" : "text-muted-foreground")}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notif.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {notif.time}
                        </p>
                      </div>
                      {!notif.read && (
                        <span className="mt-1 flex h-2 w-2 rounded-full bg-brand-orange-accessible shrink-0" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center border-t border-border-warm p-2">
              <Button variant="ghost" size="sm" onClick={markAllRead} className="flex-1 text-xs">
                <Check className="mr-2 h-3 w-3" />
                Mark all read
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll} className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="mr-2 h-3 w-3" />
                Clear
              </Button>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
