import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Bell, Calendar, MapPin } from 'lucide-react'
import { fetchStudentNoticesFeed } from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { EmptyState } from '../../shared/components/ui/EmptyState'

interface NoticeRecord {
  public_id: string
  title: string
  content: string
  notice_type: 'notice' | 'event'
  published_at?: string | null
  created_at: string
  event_date?: string | null
  event_location?: string | null
}

function formatDate(value?: string | null): string {
  return new Date(value || Date.now()).toLocaleDateString()
}

function NoticeTypeBadge({ type }: { type: NoticeRecord['notice_type'] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        type === 'event'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-brand-orange-accessible/10 text-brand-orange-accessible'
      }`}
    >
      {type === 'event' ? 'Event' : 'Notice'}
    </span>
  )
}

export default function StudentNoticesPage() {
  const [filter, setFilter] = React.useState<'all' | 'notice' | 'event'>('all')

  const noticesQuery = useQuery({
    queryKey: ['student', 'notices'],
    queryFn: fetchStudentNoticesFeed,
    staleTime: 30_000,
  })

  const notices = (noticesQuery.data ?? []).filter((notice: NoticeRecord) => filter === 'all' || notice.notice_type === filter)

  return (
    <PageWrapper className="space-y-6">
      <PageHeader title="Notices & Events" subtitle="Important updates and upcoming events from The Global Avenues." />

      <div className="flex gap-2">
        <Button variant={filter === 'all' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter('all')}>
          All
        </Button>
        <Button variant={filter === 'notice' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter('notice')}>
          Notices
        </Button>
        <Button variant={filter === 'event' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter('event')}>
          Events
        </Button>
      </div>

      {noticesQuery.isError ? (
        <EmptyState
          icon={AlertTriangle}
          heading="Notices could not be loaded"
          description={noticesQuery.error instanceof Error ? noticesQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => noticesQuery.refetch()}>Retry</Button>}
        />
      ) : noticesQuery.isLoading ? (
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-card border border-border-warm bg-surface-card p-6 animate-pulse">
              <div className="h-6 w-1/2 rounded bg-surface-warm" />
              <div className="mt-2 h-3 w-1/3 rounded bg-surface-warm" />
              <div className="mt-5 space-y-2">
                <div className="h-3 rounded bg-surface-warm" />
                <div className="h-3 rounded bg-surface-warm" />
                <div className="h-3 w-4/5 rounded bg-surface-warm" />
              </div>
            </div>
          ))}
        </div>
      ) : notices.length > 0 ? (
        <div className="grid gap-6">
          {notices.map((notice: NoticeRecord) => (
            <Card key={notice.public_id} className="hover:shadow-card-hover transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border-warm gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-brand-navy">{notice.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">Published on {formatDate(notice.published_at || notice.created_at)}</p>
                </div>
                <NoticeTypeBadge type={notice.notice_type} />
              </CardHeader>
              <CardContent className="mt-4 space-y-4">
                <div className="prose prose-sm max-w-none text-brand-navy" dangerouslySetInnerHTML={{ __html: notice.content }} />

                {notice.notice_type === 'event' ? (
                  <div className="rounded-md bg-surface-warm p-4 space-y-2 border border-border-warm">
                    {notice.event_date ? (
                      <div className="flex items-center text-xs text-brand-navy">
                        <Calendar className="mr-2 h-4 w-4 text-brand-orange-accessible" />
                        <strong>Time:</strong>&nbsp;{notice.event_date}
                      </div>
                    ) : null}
                    {notice.event_location ? (
                      <div className="flex items-center text-xs text-brand-navy">
                        <MapPin className="mr-2 h-4 w-4 text-brand-orange-accessible" />
                        <strong>Location:</strong>&nbsp;{notice.event_location}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border-warm py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Bell className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-brand-navy">No updates found</h3>
            <p className="text-sm text-muted-foreground mt-1">There are no updates in this category.</p>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  )
}
