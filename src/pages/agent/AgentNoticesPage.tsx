import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { StatusBadge } from '../../shared/components/ui/Badge'
import { Bell, Calendar, MapPin } from 'lucide-react'

interface B2BNotice {
  id: string
  title: string
  date: string
  type: 'notice' | 'event'
  content: string
  eventDate?: string
  location?: string
}

const MOCK_NOTICES: B2BNotice[] = [
  {
    id: 'an-1',
    title: 'New Commissions Payout Structure',
    date: '2026-06-22',
    type: 'notice',
    content: 'We have updated our commission slabs for Fall 2026. Partners with > 10 enrolled students will receive a bonus tier override. Please review the updated handbook.',
  },
  {
    id: 'an-2',
    title: 'Schengen Visa Procedures Webinar',
    date: '2026-06-15',
    type: 'event',
    content: 'A B2B webinar detailing the recent Schengen visa slot booking changes and block account requirements for Canada and Austria.',
    eventDate: '2026-06-28 at 16:00 IST',
    location: 'Zoom Webinar',
  }
]

export default function AgentNoticesPage() {
  const [filter, setFilter] = React.useState<'all' | 'notice' | 'event'>('all')

  const filteredNotices = MOCK_NOTICES.filter(n => filter === 'all' || n.type === filter)

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Agent Notices & Events" 
        subtitle="Stay updated with the latest university partner news, commission slab updates, and events." 
      />

      <div className="flex gap-2">
        <Button 
          variant={filter === 'all' ? 'primary' : 'secondary'} 
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button 
          variant={filter === 'notice' ? 'primary' : 'secondary'} 
          size="sm"
          onClick={() => setFilter('notice')}
        >
          Notices
        </Button>
        <Button 
          variant={filter === 'event' ? 'primary' : 'secondary'} 
          size="sm"
          onClick={() => setFilter('event')}
        >
          Events
        </Button>
      </div>

      <div className="grid gap-6">
        {filteredNotices.length > 0 ? (
          filteredNotices.map((notice) => (
            <Card key={notice.id} className="hover:shadow-card-hover transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border-warm">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-brand-navy">{notice.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">Published on {notice.date}</p>
                </div>
                <StatusBadge status={notice.type === 'notice' ? 'registered' : 'pending'} />
              </CardHeader>
              <CardContent className="mt-4 space-y-4">
                <p className="text-sm text-brand-navy leading-relaxed">{notice.content}</p>
                
                {notice.type === 'event' && (
                  <div className="rounded-md bg-surface-warm p-4 space-y-2 border border-border-warm">
                    <div className="flex items-center text-xs text-brand-navy">
                      <Calendar className="mr-2 h-4 w-4 text-brand-orange-accessible" />
                      <strong>Time:</strong>&nbsp;{notice.eventDate}
                    </div>
                    <div className="flex items-center text-xs text-brand-navy">
                      <MapPin className="mr-2 h-4 w-4 text-brand-orange-accessible" />
                      <strong>Location:</strong>&nbsp;{notice.location}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed border-border-warm py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Bell className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-brand-navy">No updates found</h3>
              <p className="text-sm text-muted-foreground mt-1">No notices found in this filter.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}
