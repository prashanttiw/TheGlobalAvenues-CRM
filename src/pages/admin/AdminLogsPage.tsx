import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { fetchAdminActivityLogs } from '../../lib/api'
import { useAuth } from '../../shared/hooks/useAuth'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { ActivityLogTable } from '../../shared/components/activity/ActivityLogTable'
import { useUrlFilters, useDebouncedFilterSync } from '../../shared/hooks/useUrlFilters'
import { ClearFiltersButton } from '../../shared/components/ui/ClearFiltersButton'

export default function AdminLogsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.isSuperAdmin === true || (user?.permissions?.includes('*') ?? false)

  const { filters, setFilter, clearFilters, hasActiveFilters } = useUrlFilters({
    from: '', to: '', search: '',
  })
  const dateFrom = filters.from
  const dateTo = filters.to
  const setDateFrom = (v: string) => setFilter('from', v)
  const setDateTo = (v: string) => setFilter('to', v)

  const [searchQuery, setSearchQuery] = React.useState(filters.search)
  useDebouncedFilterSync(searchQuery, (v) => setFilter('search', v))

  const handleClearFilters = () => {
    clearFilters()
    setSearchQuery('')
  }

  const logsQuery = useQuery({
    queryKey: ['admin', 'activity-logs', dateFrom, dateTo],
    queryFn: () => fetchAdminActivityLogs({ perPage: 100, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    staleTime: 30_000,
    enabled: !isSuperAdmin,
  })

  const logs = (logsQuery.data?.logs ?? []).filter((log) => {
    if (!searchQuery) return true
    const haystack = [log.label, log.action, log.target_display, log.target_type, log.target_public_id, log.ip_address]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(searchQuery.toLowerCase())
  })

  // Super admins only use Super Activity Log — it already covers their own
  // actions plus everyone else's, so the "own actions" page is redundant for them.
  if (isSuperAdmin) {
    return <Navigate to="/portal/admin/super-logs" replace />
  }

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Activity Log"
        subtitle="Your own actions across the CRM."
      />

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your activity..."
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
        {hasActiveFilters && <ClearFiltersButton className="" onClick={handleClearFilters} />}
      </div>

      <ActivityLogTable
        logs={logs}
        isLoading={logsQuery.isLoading}
        isError={logsQuery.isError}
        errorMessage={logsQuery.error instanceof Error ? logsQuery.error.message : undefined}
        onRetry={() => logsQuery.refetch()}
        emptyMessage="No activity recorded for you yet."
      />
    </PageWrapper>
  )
}
