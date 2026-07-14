import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, ArrowRight, Calendar, Globe, User } from 'lucide-react'
import { fetchAgentApplications, fetchAgentTeam } from '../../lib/api'
import { useAuth } from '../../shared/hooks/useAuth'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Button } from '../../shared/components/ui/Button'
import { Badge, StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'

interface AgentApplicationRecord {
  public_id: string
  reference_number: string
  status: string
  submitted_at?: string | null
  created_at: string
  intake_name: string
  intake_month: number
  intake_year: number
  course_name: string
  course_level: string
  university_name: string
  student_name: string
  student_pid: string
  agent_public_id: string
  agent_name: string
  agent_agency?: string | null
  agent_tier?: number | string | null
}

const KNOWN_STATUSES = new Set<StatusType>([
  'registered',
  'pending',
  'approved',
  'rejected',
  'suspended',
  'enrolled',
  'draft',
  'submitted',
  'under_review',
  'offer_received',
  'paid',
  'confirmed',
])

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function renderStatus(status: string) {
  return KNOWN_STATUSES.has(status as StatusType) ? (
    <StatusBadge status={status as StatusType} />
  ) : (
    <Badge variant="secondary">{formatStatusLabel(status)}</Badge>
  )
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Not submitted'
  }

  return new Date(value).toLocaleDateString()
}

export default function AgentApplicationsPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = React.useState('')
  const [agentFilter, setAgentFilter] = React.useState('')
  const [page, setPage] = React.useState(1)

  const ownerPid = agentFilter === '__self__' ? user?.publicId : agentFilter || undefined

  const applicationsQuery = useQuery({
    queryKey: ['agent', 'applications', { page, statusFilter, ownerPid }],
    queryFn: () =>
      fetchAgentApplications({
        page,
        perPage: 15,
        status: statusFilter || undefined,
        agentPid: ownerPid,
      }),
    staleTime: 30_000,
  })

  const teamQuery = useQuery({
    queryKey: ['agent', 'team', 'options'],
    queryFn: fetchAgentTeam,
    staleTime: 120_000,
  })

  const columns: ColumnDef<AgentApplicationRecord>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: (row) => {
        const isDirectStudent = row.agent_public_id === user?.publicId
        const ownerLabel = isDirectStudent ? 'Direct student' : row.agent_name

        return (
          <div>
            <p className="font-semibold text-brand-navy flex items-center gap-1">
              <User className="h-3 w-3 text-muted-foreground" />
              {row.student_name}
            </p>
            <p className="text-[10px] text-muted-foreground">Owned by {ownerLabel}</p>
          </div>
        )
      },
    },
    {
      key: 'university',
      header: 'University',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy flex items-center gap-1">
            <Globe className="h-3 w-3 text-muted-foreground" />
            {row.university_name}
          </p>
          <p className="text-xs text-muted-foreground">{row.course_name}</p>
        </div>
      ),
    },
    {
      key: 'reference',
      header: 'Application ID',
      cell: (row) => <span className="font-mono text-xs text-brand-navy">{row.reference_number}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => renderStatus(row.status),
    },
    {
      key: 'date',
      header: 'Submitted',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {formatDate(row.submitted_at || row.created_at)}
        </span>
      ),
    },
  ]

  const applications = applicationsQuery.data?.applications ?? []
  const meta = applicationsQuery.data?.meta as any
  const team = teamQuery.data ?? []

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Network Applications"
        subtitle="Track real application statuses across your allowed student tree."
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <div className="flex flex-1 gap-2 flex-col sm:flex-row sm:flex-wrap w-full">
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            className="w-full sm:w-44 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="offer_received">Offer Received</option>
            <option value="enrolled">Enrolled</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={agentFilter}
            onChange={(event) => {
              setAgentFilter(event.target.value)
              setPage(1)
            }}
            className="w-full sm:w-56 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            disabled={teamQuery.isLoading}
          >
            <option value="">Entire Allowed Network</option>
            <option value="__self__">My Direct Students</option>
            {team.map((subAgent: any) => (
              <option key={subAgent.public_id} value={subAgent.public_id}>
                {subAgent.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {applicationsQuery.isError ? (
        <EmptyState
          icon={AlertTriangle}
          heading="Applications could not be loaded"
          description={applicationsQuery.error instanceof Error ? applicationsQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => applicationsQuery.refetch()}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={applications}
          isLoading={applicationsQuery.isLoading}
          emptyMessage="No student applications match this scope yet."
        />
      )}

      {meta && meta.total_pages > 1 ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.total_pages} (Total: {meta.total})
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={!meta.has_prev}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={!meta.has_next}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </PageWrapper>
  )
}


