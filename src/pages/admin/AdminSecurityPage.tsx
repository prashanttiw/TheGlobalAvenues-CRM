import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Calendar } from 'lucide-react'
import { fetchAdminSecurityEvents } from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { Button } from '../../shared/components/ui/Button'

interface SecurityEvent {
  id: number
  event_type: string
  identifier: string | null
  ip_address: string | null
  user_agent: string | null
  details: unknown
  created_at: string
}

function formatEventLabel(value: string) {
  return value.replace(/_/g, ' ')
}

function formatDetails(details: unknown) {
  if (typeof details === 'string') return details
  if (details == null) return 'No details recorded.'
  try {
    return JSON.stringify(details)
  } catch {
    return String(details)
  }
}

export default function AdminSecurityPage() {
  const [eventTypeFilter, setEventTypeFilter] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')

  const eventsQuery = useQuery({
    queryKey: ['admin', 'security-events', eventTypeFilter],
    queryFn: () => fetchAdminSecurityEvents({ perPage: 100, eventType: eventTypeFilter || undefined }),
    staleTime: 30_000,
  })

  const events = ((eventsQuery.data?.events ?? []) as SecurityEvent[]).filter((event) => {
    if (!searchQuery) return true
    const haystack = [event.event_type, event.identifier, event.ip_address, formatDetails(event.details)].join(' ').toLowerCase()
    return haystack.includes(searchQuery.toLowerCase())
  })

  const columns: ColumnDef<SecurityEvent>[] = [
    {
      key: 'eventType',
      header: 'Event Type',
      cell: (row) => {
        const isCritical = row.event_type === 'otp_brute_force' || row.event_type === 'rate_limit_exceeded'
        return (
          <span
            className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
              isCritical ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-brand-navy/5 text-brand-navy'
            }`}
          >
            {isCritical ? <AlertTriangle className="h-3 w-3 shrink-0" /> : null}
            {formatEventLabel(row.event_type)}
          </span>
        )
      },
    },
    {
      key: 'identity',
      header: 'Identifier / IP',
      cell: (row) => (
        <div className="text-xs text-brand-navy">
          <p className="font-mono">{row.ip_address || 'IP unavailable'}</p>
          <p className="mt-1 text-muted-foreground break-all">{row.identifier || 'Identifier unavailable'}</p>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      cell: (row) => {
        const isCritical = row.event_type === 'otp_brute_force' || row.event_type === 'rate_limit_exceeded'
        return <span className={`text-xs ${isCritical ? 'text-red-600 font-medium' : 'text-brand-navy'}`}>{formatDetails(row.details)}</span>
      },
    },
    {
      key: 'date',
      header: 'Timestamp',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1.5 h-3.5 w-3.5" />
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Security Events"
        subtitle="Live security event stream for suspicious activity and account changes."
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="w-full sm:w-56 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        >
          <option value="">All Events</option>
          <option value="otp_brute_force">OTP Brute Force Alerts</option>
          <option value="rate_limit_exceeded">Rate Limit Exceeded</option>
          <option value="login_failed">Failed Logins</option>
          <option value="password_changed">Password Changes</option>
        </select>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search security events..."
          className="w-full sm:w-80 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        />
      </div>

      {eventsQuery.isError ? (
        <EmptyState
          heading="Security events could not be loaded"
          description={eventsQuery.error instanceof Error ? eventsQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => eventsQuery.refetch()}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={events}
          isLoading={eventsQuery.isLoading}
          emptyMessage="No security events matched the current criteria."
        />
      )}
    </PageWrapper>
  )
}
