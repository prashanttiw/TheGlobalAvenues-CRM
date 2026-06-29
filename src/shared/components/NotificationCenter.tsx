import * as React from 'react'
import {
  AlertCircle,
  Bell,
  BellOff,
  Check,
  CreditCard,
  FileText,
  RefreshCcw,
  Send,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './ui/Button'
import {
  PreviewDrawer,
  PreviewDrawerBody,
  PreviewDrawerContent,
  PreviewDrawerHeader,
  PreviewDrawerTrigger,
} from './ui/PreviewDrawer'
import {
  useMarkRead,
  useMarkReadAll,
  useNotifications,
  useUnreadCount,
  type NotificationRecord,
} from '../hooks/useNotifications'

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'documents', label: 'Documents' },
  { id: 'applications', label: 'Applications' },
  { id: 'payments', label: 'Payments' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'system', label: 'System' },
] as const

function getCategoryIcon(category?: string | null) {
  switch (category) {
    case 'documents':
      return <FileText className="h-4 w-4 text-sky-600" />
    case 'applications':
      return <Send className="h-4 w-4 text-violet-600" />
    case 'payments':
      return <CreditCard className="h-4 w-4 text-emerald-600" />
    case 'approvals':
      return <ShieldCheck className="h-4 w-4 text-amber-600" />
    case 'system':
      return <Settings className="h-4 w-4 text-slate-600" />
    default:
      return <Bell className="h-4 w-4 text-brand-orange-accessible" />
  }
}

function formatNotificationTitle(notification: NotificationRecord) {
  if (notification.subject && notification.subject.trim() !== '') {
    return notification.subject.trim()
  }

  return notification.event_key
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatNotificationTime(timestamp: string) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function NotificationSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-border-warm bg-surface-card p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-surface-warm" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-surface-warm" />
              <div className="h-3 w-full animate-pulse rounded bg-surface-warm" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-surface-warm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeCategory, setActiveCategory] = React.useState('')

  const unreadCount = useUnreadCount()
  const notifications = useNotifications(activeCategory, 'all', isOpen)
  const markRead = useMarkRead()
  const markReadAll = useMarkReadAll()

  const refetchUnreadCount = unreadCount.refetch
  const refetchNotifications = notifications.refetch

  React.useEffect(() => {
    if (!isOpen) {
      return
    }

    void refetchUnreadCount()
    void refetchNotifications()
  }, [isOpen, refetchNotifications, refetchUnreadCount])

  const totalUnread = unreadCount.data?.count ?? 0
  const byCategory = unreadCount.data?.by_category ?? {}
  const activeUnreadCount = activeCategory === '' ? totalUnread : byCategory[activeCategory] ?? 0

  const handleMarkAllRead = () => {
    markReadAll.mutate(activeCategory || undefined)
  }

  const handleOpenNotification = (notification: NotificationRecord) => {
    if (!notification.read_at) {
      markRead.mutate(notification.public_id)
    }
  }

  return (
    <PreviewDrawer open={isOpen} onOpenChange={setIsOpen}>
      <PreviewDrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-brand-navy" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange-accessible px-1.5 text-[10px] font-bold text-white ring-2 ring-surface-card">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </PreviewDrawerTrigger>

      <PreviewDrawerContent>
        <PreviewDrawerHeader
          title="Notifications"
          badge={
            <span className="inline-flex items-center gap-2 rounded-full border border-border-warm bg-surface-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className={cn('h-2 w-2 rounded-full', totalUnread > 0 ? 'bg-brand-orange-accessible' : 'bg-emerald-500')} />
              {totalUnread > 0 ? `${totalUnread} unread` : 'Up to date'}
            </span>
          }
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Live activity from documents, applications, payments, approvals, and system events.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={activeUnreadCount === 0 || markReadAll.isPending}
              isLoading={markReadAll.isPending}
              className="shrink-0"
            >
              <Check className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          </div>
        </PreviewDrawerHeader>

        <div className="border-b border-border-warm bg-surface-card px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((category) => {
              const isActive = activeCategory === category.id
              const badgeCount = category.id === '' ? totalUnread : byCategory[category.id] ?? 0

              return (
                <button
                  key={category.id || 'all'}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-brand-orange-accessible bg-brand-orange-accessible text-white'
                      : 'border-border-warm bg-surface-warm text-brand-navy hover:bg-surface-card',
                  )}
                >
                  <span>{category.label}</span>
                  {badgeCount > 0 && (
                    <span
                      className={cn(
                        'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                        isActive ? 'bg-white/20 text-white' : 'bg-brand-orange-accessible/10 text-brand-orange-accessible',
                      )}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <PreviewDrawerBody className="space-y-3 p-4">
          {notifications.isLoading ? (
            <NotificationSkeleton />
          ) : notifications.isError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-sm font-semibold text-brand-navy">Could not load notifications</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {(notifications.error as Error | undefined)?.message ?? 'The notification service did not return data.'}
              </p>
              <Button variant="secondary" size="sm" onClick={() => void notifications.refetch()} className="mt-4">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : notifications.data && notifications.data.length > 0 ? (
            notifications.data.map((notification) => {
              const unread = !notification.read_at
              return (
                <div
                  key={notification.public_id}
                  className={cn(
                    'group rounded-xl border p-4 transition-colors',
                    unread
                      ? 'border-brand-orange-accessible/30 bg-brand-orange-accessible/5'
                      : 'border-border-warm bg-surface-card hover:bg-surface-warm/60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                        unread ? 'border-brand-orange-accessible/20 bg-white' : 'border-border-warm bg-surface-warm',
                      )}
                    >
                      {getCategoryIcon(notification.category)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenNotification(notification)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={cn('truncate text-sm', unread ? 'font-semibold text-brand-navy' : 'font-medium text-brand-navy')}>
                            {formatNotificationTitle(notification)}
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                            {notification.body?.trim() || 'No additional details were provided for this notification.'}
                          </p>
                        </div>
                        {unread && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-orange-accessible" />}
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                        <span>{formatNotificationTime(notification.created_at)}</span>
                        <span className="h-1 w-1 rounded-full bg-border-warm" />
                        <span className="uppercase tracking-wide">{notification.category || 'general'}</span>
                      </div>
                    </button>

                    {unread && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        onClick={() => markRead.mutate(notification.public_id)}
                        aria-label={`Mark ${formatNotificationTitle(notification)} as read`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-xl border border-dashed border-border-warm bg-surface-card px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-warm">
                <BellOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-brand-navy">No notifications here</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeCategory === ''
                  ? 'New activity will appear here as the backend queue delivers in-app notifications.'
                  : `You have no ${activeCategory} notifications right now.`}
              </p>
            </div>
          )}
        </PreviewDrawerBody>
      </PreviewDrawerContent>
    </PreviewDrawer>
  )
}
