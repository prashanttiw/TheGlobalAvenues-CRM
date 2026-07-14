import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSuperActivityLogs } from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { ActivityLogTable } from '../../shared/components/activity/ActivityLogTable'

export default function AdminSuperLogsPage() {
  const [actorTypeFilter, setActorTypeFilter] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')

  const logsQuery = useQuery({
    queryKey: ['admin', 'super-activity-logs', actorTypeFilter, dateFrom, dateTo],
    queryFn: () =>
      fetchSuperActivityLogs({
        perPage: 100,
        actorType: actorTypeFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    staleTime: 30_000,
  })

  const logs = (logsQuery.data?.logs ?? []).filter((log) => {
    if (!searchQuery) return true
    const haystack = [
      log.label,
      log.actor_display_name,
      log.action,
      log.target_display,
      log.target_type,
      log.target_public_id,
      log.ip_address,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(searchQuery.toLowerCase())
  })

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Super Activity Log"
        subtitle="System-wide audit trail — every admin, agent, and student action."
      />

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <select
          value={actorTypeFilter}
          onChange={(e) => setActorTypeFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        >
          <option value="">All Actor Types</option>
          <option value="admin">Administrator Logs</option>
          <option value="agent">Agent Partner Logs</option>
          <option value="student">Student Logs</option>
          <option value="system">System / Cron</option>
        </select>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search logs..."
          className="w-full sm:w-72 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        />

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full sm:w-44 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          aria-label="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full sm:w-44 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          aria-label="To date"
        />
      </div>

      <ActivityLogTable
        logs={logs}
        isLoading={logsQuery.isLoading}
        isError={logsQuery.isError}
        errorMessage={logsQuery.error instanceof Error ? logsQuery.error.message : undefined}
        onRetry={() => logsQuery.refetch()}
        emptyMessage="No audit logs matched the current criteria."
      />
    </PageWrapper>
  )
}
