import * as React from 'react'
import * as Icons from 'lucide-react'
import { Activity, Clock, Info } from 'lucide-react'
import type { ActivityLogEntry } from '../../../lib/api'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/SkeletonLoader'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalAction,
} from '../ui/Modal'

function formatLabel(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return value.replace(/_/g, ' ')
}

function formatJson(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function timeAgoFallback(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface ActivityLogTableProps {
  logs: ActivityLogEntry[]
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  onRetry?: () => void
  emptyMessage?: string
}

function RowSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-warm bg-surface-card p-3.5">
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

export function ActivityLogTable({
  logs,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  emptyMessage = 'No activity matched the current criteria.',
}: ActivityLogTableProps) {
  const [detailLog, setDetailLog] = React.useState<ActivityLogEntry | null>(null)

  if (isError) {
    return (
      <EmptyState
        heading="Activity log could not be loaded"
        description={errorMessage || 'The backend request failed.'}
        action={onRetry ? <Button onClick={onRetry}>Retry</Button> : undefined}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
      </div>
    )
  }

  if (!logs.length) {
    return <EmptyState heading="No activity found" description={emptyMessage} className="my-4" />
  }

  const beforeJson = detailLog ? formatJson(detailLog.before_value) : null
  const afterJson = detailLog ? formatJson(detailLog.after_value) : null

  return (
    <>
      <div className="space-y-2.5">
        {logs.map((log) => {
          const Icon = (log.icon && (Icons as Record<string, React.ElementType>)[log.icon]) || Activity
          return (
            <button
              key={log.id}
              type="button"
              onClick={() => setDetailLog(log)}
              className="flex w-full items-start gap-3 rounded-xl border border-border-warm bg-surface-card p-3.5 text-left transition-colors hover:border-brand-navy/20 hover:bg-surface-warm"
            >
              <div className="mt-0.5 shrink-0 rounded-full bg-brand-orange-accessible/10 p-2 text-brand-orange-accessible">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-brand-navy">
                  {log.label || `${log.actor_display_name || 'Someone'} ${formatLabel(log.action)}`}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded bg-brand-navy/5 px-1.5 py-0.5 font-bold uppercase text-brand-navy">
                    {formatLabel(log.actor_user_type)}
                  </span>
                  <span className="flex items-center gap-1" title={new Date(log.created_at).toLocaleString()}>
                    <Clock className="h-3 w-3" />
                    {log.time_ago || timeAgoFallback(log.created_at)}
                  </span>
                </div>
              </div>
              <Info className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50" />
            </button>
          )
        })}
      </div>

      <Modal open={!!detailLog} onOpenChange={(v) => { if (!v) setDetailLog(null) }}>
        <ModalContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailLog && (
            <>
              <ModalHeader>
                <ModalTitle>{detailLog.label || formatLabel(detailLog.action)}</ModalTitle>
                <ModalDescription>
                  {detailLog.actor_display_name || 'Unknown actor'} ({formatLabel(detailLog.actor_user_type)}) &middot;{' '}
                  {new Date(detailLog.created_at).toLocaleString()}
                </ModalDescription>
              </ModalHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border-warm bg-surface-warm p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Target</p>
                    <p className="mt-1 text-brand-navy font-medium break-words">
                      {detailLog.target_display || detailLog.target_public_id || 'No target label'}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatLabel(detailLog.target_type)}</p>
                  </div>
                  <div className="rounded-lg border border-border-warm bg-surface-warm p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Request Info</p>
                    <p className="mt-1 text-brand-navy font-medium break-words">{detailLog.ip_address || 'Unknown IP'}</p>
                    <p className="text-xs text-muted-foreground break-words">{detailLog.user_agent || 'No user agent recorded'}</p>
                  </div>
                </div>

                {(beforeJson || afterJson) && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {beforeJson && (
                      <div className="rounded-lg border border-border-warm bg-surface-warm p-3">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Before</p>
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] text-brand-navy">{beforeJson}</pre>
                      </div>
                    )}
                    {afterJson && (
                      <div className="rounded-lg border border-border-warm bg-surface-warm p-3">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">After</p>
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] text-brand-navy">{afterJson}</pre>
                      </div>
                    )}
                  </div>
                )}

                {!beforeJson && !afterJson && (
                  <p className="text-xs text-muted-foreground">No before/after change data was recorded for this action.</p>
                )}
              </div>

              <ModalFooter>
                <ModalAction onClick={() => setDetailLog(null)}>Close</ModalAction>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
