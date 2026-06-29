import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, Terminal, User } from 'lucide-react'
import { fetchAdminActivityLogs } from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { Button } from '../../shared/components/ui/Button'

interface SystemLog {
  id: number
  actor_user_type: string
  actor_display_name: string | null
  action: string
  target_type: string | null
  target_public_id: string | null
  target_display: string | null
  ip_address: string | null
  created_at: string
}

function formatLabel(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return value.replace(/_/g, ' ')
}

export default function AdminLogsPage() {
  const [actorTypeFilter, setActorTypeFilter] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')

  const logsQuery = useQuery({
    queryKey: ['admin', 'activity-logs', actorTypeFilter],
    queryFn: () => fetchAdminActivityLogs({ perPage: 100, actorType: actorTypeFilter || undefined }),
    staleTime: 30_000,
  })

  const logs = ((logsQuery.data?.logs ?? []) as SystemLog[]).filter((log) => {
    if (!searchQuery) return true
    const haystack = [
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

  const columns: ColumnDef<SystemLog>[] = [
    {
      key: 'actor',
      header: 'Actor',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {row.actor_display_name || 'Unknown actor'}
          </p>
          <span className="text-[9px] uppercase font-bold text-brand-navy bg-brand-navy/5 px-1.5 py-0.5 rounded">
            {formatLabel(row.actor_user_type)}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      cell: (row) => <span className="text-brand-navy font-medium">{formatLabel(row.action)}</span>,
    },
    {
      key: 'target',
      header: 'Target Entity',
      cell: (row) => (
        <div className="text-xs text-muted-foreground">
          <span className="flex items-center">
            <Terminal className="mr-1.5 h-3.5 w-3.5 text-brand-orange-accessible" />
            {row.target_display || row.target_public_id || 'No target label'}
          </span>
          <p className="mt-1 uppercase tracking-wide">{formatLabel(row.target_type)}</p>
        </div>
      ),
    },
    {
      key: 'timestamp',
      header: 'Date/Time',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Activity Logs"
        subtitle="System-wide audit trail backed by the live activity log stream."
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <select
          value={actorTypeFilter}
          onChange={(e) => setActorTypeFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        >
          <option value="">All Actor Types</option>
          <option value="admin">Administrator Logs</option>
          <option value="agent">Agent Partner Logs</option>
          <option value="student">Student Logs</option>
        </select>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search logs..."
          className="w-full sm:w-80 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        />
      </div>

      {logsQuery.isError ? (
        <EmptyState
          heading="Activity logs could not be loaded"
          description={logsQuery.error instanceof Error ? logsQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => logsQuery.refetch()}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          isLoading={logsQuery.isLoading}
          emptyMessage="No audit logs matched the current criteria."
        />
      )}
    </PageWrapper>
  )
}
