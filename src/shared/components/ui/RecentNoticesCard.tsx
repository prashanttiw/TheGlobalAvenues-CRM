import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Bell, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'

interface NoticeFeedItem {
  public_id: string
  title: string
  notice_type: 'notice' | 'event'
  published_at?: string | null
  created_at: string
  event_date?: string | null
}

interface RecentNoticesCardProps {
  fetchFn: (params: Record<string, any>) => Promise<{ notices: NoticeFeedItem[] }>
  viewAllPath: string
  queryKeyPrefix: string
  limit?: number
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatEventDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Compact "top N recent notices/events" widget for a portal's Overview page — reuses the same
 *  role-scoped notices/feed endpoint the full Notices page already calls, just capped to `limit`. */
export function RecentNoticesCard({ fetchFn, viewAllPath, queryKeyPrefix, limit = 6 }: RecentNoticesCardProps) {
  const navigate = useNavigate()

  const noticesQuery = useQuery({
    queryKey: [queryKeyPrefix, 'notices', 'recent', limit],
    queryFn: () => fetchFn({ page: 1, per_page: limit, sort: 'desc' }),
    staleTime: 60_000,
  })

  const notices = noticesQuery.data?.notices ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <Bell className="h-4 w-4 text-brand-orange-accessible" />
          Notices &amp; Events
        </CardTitle>
        <Button variant="secondary" size="sm" onClick={() => navigate(viewAllPath)}>
          View all
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {noticesQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : notices.length === 0 ? (
          <p className="text-xs text-muted-foreground">No notices or events right now.</p>
        ) : (
          notices.map((notice) => (
            <div
              key={notice.public_id}
              className="flex items-start gap-3 rounded-card border border-border-warm px-3 py-2.5 transition-colors hover:border-brand-orange-accessible/25 hover:bg-brand-orange-accessible/5"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  notice.notice_type === 'event' ? 'bg-amber-400' : 'bg-brand-orange-accessible'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-brand-navy">{notice.title}</p>
                {notice.notice_type === 'event' && notice.event_date ? (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-700">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {formatEventDate(notice.event_date)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDate(notice.published_at || notice.created_at)}
                  </p>
                )}
              </div>
              <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {notice.notice_type === 'event' ? 'Event' : 'Notice'}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
