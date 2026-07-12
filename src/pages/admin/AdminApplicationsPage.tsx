import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Calendar, Globe, User } from 'lucide-react'
import { fetchAdminApplications } from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { SearchInput } from '../../shared/components/ui/SearchInput'
import { ApplicationDetailDrawer, renderApplicationStatus } from '../../shared/components/applications/ApplicationDetailDrawer'

interface AdminApplicationRecord {
  public_id: string
  reference_number: string
  student_name: string
  student_pid: string
  university_name: string
  course_name: string
  status: string
  submitted_at?: string | null
  created_at: string
  intake_year: number
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString()
}

export default function AdminApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = React.useState('')
  const [univFilter, setUnivFilter] = React.useState('')
  const [yearFilter, setYearFilter] = React.useState('')
  const [selectedPid, setSelectedPid] = React.useState<string | null>(() => searchParams.get('open'))
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')

  // Deep-link support: global search opens a specific application via ?open=<pid>
  // without needing it to be on the currently loaded/filtered page — the drawer
  // fetches its own detail data independently of the list.
  const handleDrawerOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      setSelectedPid(null)
      if (searchParams.has('open')) {
        const next = new URLSearchParams(searchParams)
        next.delete('open')
        setSearchParams(next, { replace: true })
      }
    }
  }, [searchParams, setSearchParams])

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const applicationsQuery = useQuery({
    queryKey: ['admin', 'applications', debouncedSearch],
    queryFn: () => fetchAdminApplications({ perPage: 100, search: debouncedSearch || undefined }),
    staleTime: 30_000,
  })

  const allApplications = (applicationsQuery.data?.applications ?? []) as AdminApplicationRecord[]
  const applications = allApplications.filter((app) => {
    const matchesStatus = !statusFilter || app.status === statusFilter
    const matchesUniversity = !univFilter || app.university_name === univFilter
    const matchesYear = !yearFilter || String(app.intake_year) === yearFilter
    return matchesStatus && matchesUniversity && matchesYear
  })
  const universityOptions = Array.from(new Set(allApplications.map((app) => app.university_name).filter(Boolean))).sort()
  const yearOptions = Array.from(new Set(allApplications.map((app) => app.intake_year).filter(Boolean))).sort((a, b) => a - b)

  const columns: ColumnDef<AdminApplicationRecord>[] = [
    {
      key: 'reference',
      header: 'Reference',
      cell: (row) => <span className="font-mono text-xs font-semibold text-brand-navy">{row.reference_number}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      cell: (row) => (
        <p className="font-semibold text-brand-navy flex items-center gap-1">
          <User className="h-3 w-3 text-muted-foreground" />
          {row.student_name}
        </p>
      ),
    },
    {
      key: 'university',
      header: 'University & Course',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy flex items-center gap-1 text-xs">
            <Globe className="h-3 w-3 text-muted-foreground" />
            {row.university_name}
          </p>
          <p className="text-[10px] text-muted-foreground">{row.course_name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => renderApplicationStatus(row.status),
    },
    {
      key: 'date',
      header: 'Submission Date',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {formatDate(row.submitted_at || row.created_at)}
        </span>
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Student Applications"
        subtitle="Manage real academic applications across the live portal pipeline."
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <SearchInput
          value={search}
          onChange={setSearch}
          isLoading={applicationsQuery.isFetching}
          placeholder="Search by reference #, student, course, or university…"
          className="sm:max-w-sm"
        />
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="offer_received">Offer Received</option>
            <option value="enrolled">Enrolled</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>

          <select value={univFilter} onChange={(e) => setUnivFilter(e.target.value)} className="w-full sm:w-48 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none">
            <option value="">All Universities</option>
            {universityOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="w-full sm:w-36 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none">
            <option value="">All Years</option>
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {applicationsQuery.isError ? (
        <EmptyState
          icon={Globe}
          heading="Applications could not be loaded"
          description={applicationsQuery.error instanceof Error ? applicationsQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => applicationsQuery.refetch()}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={applications}
          isLoading={applicationsQuery.isLoading}
          onRowClick={(row) => setSelectedPid(row.public_id)}
          emptyMessage="No applications match the current filters."
        />
      )}

      <ApplicationDetailDrawer applicationPid={selectedPid} onOpenChange={handleDrawerOpenChange} />
    </PageWrapper>
  )
}
