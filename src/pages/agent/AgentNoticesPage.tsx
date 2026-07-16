import * as React from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Bell, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
import { fetchAgentNoticesFeed } from '../../lib/api'
import { NoticesFeedView } from '../../shared/components/ui/NoticesFeedView'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent } from '../../shared/components/ui/Card'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { useUrlFilters } from '../../shared/hooks/useUrlFilters'
import { ClearFiltersButton } from '../../shared/components/ui/ClearFiltersButton'

interface PaginationMeta {
  current_page: number
  per_page: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

const PER_PAGE = 20
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const VIEW_MODE_KEY = 'agent_notices_view_mode'

function readStoredViewMode(): 'grid' | 'table' {
  try { return (localStorage.getItem(VIEW_MODE_KEY) as 'grid' | 'table') || 'grid' } catch { return 'grid' }
}

export default function AgentNoticesPage() {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useUrlFilters({
    type: 'all', sort: 'desc', page: '1',
  })
  const filter = filters.type as 'all' | 'notice' | 'event'
  const sortDir = filters.sort as 'desc' | 'asc'
  const page = Number(filters.page) || 1
  const setFilter = (v: 'all' | 'notice' | 'event') => setFilters({ type: v, page: '1' })
  const setSortDir = (v: 'desc' | 'asc') => setFilters({ sort: v, page: '1' })
  const setPage = (updater: number | ((p: number) => number)) => {
    const next = typeof updater === 'function' ? (updater as (p: number) => number)(page) : updater
    setFilters({ page: String(next) })
  }
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>(readStoredViewMode)

  const handleViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode)
    try { localStorage.setItem(VIEW_MODE_KEY, mode) } catch {}
  }

  const noticesQuery = useQuery({
    queryKey: ['agent', 'notices', { filter, sortDir, page }],
    queryFn: () =>
      fetchAgentNoticesFeed({
        page,
        per_page: PER_PAGE,
        sort: sortDir,
        ...(filter !== 'all' ? { notice_type: filter } : {}),
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  const notices = noticesQuery.data?.notices ?? []
  const meta = noticesQuery.data?.meta as PaginationMeta | undefined
  const totalPages = meta?.total_pages ?? 1

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Notices & Events"
        subtitle="Live partner notices and events targeted to agent users."
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface-card border border-border-warm rounded-xl p-3">
        {/* Type filter */}
        <div className="flex gap-1.5">
          {(['all', 'notice', 'event'] as const).map((val) => (
            <Button
              key={val}
              variant={filter === val ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter(val)}
            >
              {val === 'all' ? 'All' : val === 'notice' ? 'Notices' : 'Events'}
            </Button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
          className="px-3 py-1.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        >
          <option value="desc">Latest First</option>
          <option value="asc">Oldest First</option>
        </select>
        {hasActiveFilters && <ClearFiltersButton className="" onClick={clearFilters} />}

        {/* Meta count */}
        {meta && meta.total > 0 && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {meta.total} total · page {meta.current_page}/{totalPages}
          </span>
        )}

        {/* View toggle */}
        <div className="ml-auto flex rounded-lg border border-border-warm overflow-hidden">
          <button
            type="button"
            onClick={() => handleViewMode('grid')}
            title="Grid view"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-brand-orange-accessible text-white'
                : 'bg-surface-warm text-muted-foreground hover:text-brand-navy'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            onClick={() => handleViewMode('table')}
            title="Table view"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-border-warm transition-colors ${
              viewMode === 'table'
                ? 'bg-brand-orange-accessible text-white'
                : 'bg-surface-warm text-muted-foreground hover:text-brand-navy'
            }`}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {noticesQuery.isError ? (
        <EmptyState
          icon={AlertTriangle}
          heading="Notices could not be loaded"
          description={noticesQuery.error instanceof Error ? noticesQuery.error.message : 'Backend request failed.'}
          action={<Button onClick={() => noticesQuery.refetch()}>Retry</Button>}
        />
      ) : notices.length === 0 && !noticesQuery.isLoading ? (
        <Card className="border-dashed border-border-warm py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Bell className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-brand-navy">No updates found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No {filter !== 'all' ? filter + 's' : 'notices or events'} match this filter right now.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <NoticesFeedView
            notices={notices}
            isLoading={noticesQuery.isLoading && !noticesQuery.data}
            viewMode={viewMode}
            apiBase={API_BASE}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-warm pt-4">
              <p className="text-xs text-muted-foreground">
                Showing {notices.length} of {meta?.total ?? 0} notices
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta?.has_prev || noticesQuery.isFetching}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-xs font-semibold text-brand-navy px-2">
                  {meta?.current_page ?? page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta?.has_next || noticesQuery.isFetching}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  )
}
