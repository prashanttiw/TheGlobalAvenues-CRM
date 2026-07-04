import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { SearchInput } from '../../shared/components/ui/SearchInput'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { UserCheck, Check, X, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAdminReassignmentRequests, approveReassignment, denyReassignment } from '../../lib/api'
import { AgentCombobox, type AgentOption } from '../../shared/components/ui/AgentCombobox'

export default function AdminReassignmentsPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  // Default to the actionable "pending" view, but when arriving from a specific
  // student's row (e.g. AdminStudentsPage's "Reassign Agent" action) show all
  // statuses so an already-decided request isn't hidden behind the default filter.
  const [statusFilter, setStatusFilter] = React.useState(searchParams.get('student') ? '' : 'pending')
  const [search, setSearch] = React.useState(searchParams.get('student') ?? '')
  const [debouncedSearch, setDebouncedSearch] = React.useState(searchParams.get('student') ?? '')
  const [page, setPage] = React.useState(1)
  const [actionTarget, setActionTarget] = React.useState<{ request: any; mode: 'approve' | 'deny' } | null>(null)
  const [overrideAgent, setOverrideAgent] = React.useState<AgentOption | null>(null)
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'reassignments', statusFilter, debouncedSearch, page],
    queryFn: () => fetchAdminReassignmentRequests({
      page,
      perPage: 15,
      status: statusFilter || undefined,
      studentSearch: debouncedSearch || undefined,
    }),
  })

  const requests = data?.requests ?? []
  const meta = data?.meta

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'reassignments'] })

  const approveMutation = useMutation({
    mutationFn: (payload: { pid: string; new_agent_code?: string; notes?: string }) =>
      approveReassignment(payload.pid, { new_agent_code: payload.new_agent_code, notes: payload.notes }),
    onSuccess: () => {
      toast.success('Reassignment approved.')
      closePanel()
      void invalidate()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to approve request.'),
  })

  const denyMutation = useMutation({
    mutationFn: (payload: { pid: string; notes?: string }) => denyReassignment(payload.pid, { notes: payload.notes }),
    onSuccess: () => {
      toast.success('Reassignment denied.')
      closePanel()
      void invalidate()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to deny request.'),
  })

  const closePanel = () => {
    setActionTarget(null)
    setOverrideAgent(null)
    setNotes('')
  }

  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!actionTarget) return
    if (actionTarget.mode === 'approve') {
      if (!overrideAgent && !actionTarget.request.requested_agent_code) {
        toast.error('Select an agent — the student left this to auto-assign, so one must be chosen here.')
        return
      }
      approveMutation.mutate({ pid: actionTarget.request.public_id, new_agent_code: overrideAgent?.referral_code ?? undefined, notes: notes || undefined })
    } else {
      denyMutation.mutate({ pid: actionTarget.request.public_id, notes: notes || undefined })
    }
  }

  const mapStatusToBadge = (status: string): StatusType => {
    switch (status) {
      case 'approved': return 'approved'
      case 'denied': return 'rejected'
      default: return 'pending'
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.student_name}</p>
          <p className="text-xs text-muted-foreground">{row.profile_status}</p>
        </div>
      ),
    },
    {
      key: 'current_agent',
      header: 'Current Agent',
      cell: (row) => (
        <span className="text-sm text-brand-navy">
          {row.current_agent_name || <span className="text-muted-foreground">Unassigned</span>}
        </span>
      ),
    },
    {
      key: 'requested_agent',
      header: 'Requested Agent',
      cell: (row) => (
        row.requested_agent_name
          ? <span className="text-sm text-brand-navy">{row.requested_agent_name} <span className="text-xs text-muted-foreground">({row.requested_agent_code})</span></span>
          : <span className="text-xs uppercase font-semibold text-muted-foreground">Auto-assign</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      cell: (row) => <span className="text-xs text-muted-foreground line-clamp-2 max-w-xs block">{row.reason}</span>,
    },
    {
      key: 'requested',
      header: 'Requested',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={mapStatusToBadge(row.status)} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        row.status === 'pending' ? (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="h-7 text-xs flex items-center gap-1" onClick={() => setActionTarget({ request: row, mode: 'approve' })}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setActionTarget({ request: row, mode: 'deny' })}>
              <X className="h-3.5 w-3.5" /> Deny
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{row.review_notes || '—'}</span>
        )
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Agent Reassignment Requests"
        subtitle="Review and action student requests to change their assigned consultant."
      />

      <Card>
        <CardHeader className="border-b border-border-warm pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-brand-navy flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-brand-navy" />
              Requests
            </CardTitle>
            <p className="text-xs text-muted-foreground">Approving assigns the requested (or overridden) agent and unlocks the student's agent_lock_status where applicable.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <SearchInput
              value={search}
              onChange={setSearch}
              isLoading={isFetching}
              placeholder="Search by student name…"
              className="w-full sm:max-w-xs"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-3 py-1.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="">All Statuses</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="mt-4">
          <DataTable
            columns={columns}
            data={requests}
            isLoading={isLoading}
            emptyMessage="No reassignment requests match the current filters."
          />

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">
                Page {page} of {meta.total_pages} (Total: {meta.total})
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SlideOverPanel
        title={actionTarget?.mode === 'approve' ? 'Approve Reassignment' : 'Deny Reassignment'}
        open={!!actionTarget}
        onOpenChange={(open) => { if (!open) closePanel() }}
      >
        {actionTarget && (
          <form onSubmit={handleSubmitAction} className="space-y-6">
            <div className="rounded-md bg-surface-warm p-3 text-sm">
              <p className="font-semibold text-brand-navy">{actionTarget.request.student_name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Current: {actionTarget.request.current_agent_name || 'Unassigned'} → Requested: {actionTarget.request.requested_agent_name ? `${actionTarget.request.requested_agent_name} (${actionTarget.request.requested_agent_code})` : 'Auto-assign (admin picks below)'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">"{actionTarget.request.reason}"</p>
            </div>

            {actionTarget.mode === 'approve' && (
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">
                  New Agent {actionTarget.request.requested_agent_code ? '(optional override)' : '(required — student left this to auto-assign)'}
                </label>
                <AgentCombobox value={overrideAgent} onChange={setOverrideAgent} scope="admin" placeholder="Search agent by name or code…" />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none focus:border-brand-navy"
              />
            </div>

            <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={closePanel}>Cancel</Button>
              <Button
                variant={actionTarget.mode === 'deny' ? 'danger' : 'primary'}
                type="submit"
                isLoading={approveMutation.isPending || denyMutation.isPending}
              >
                {actionTarget.mode === 'approve' ? 'Approve Request' : 'Deny Request'}
              </Button>
            </div>
          </form>
        )}
      </SlideOverPanel>
    </PageWrapper>
  )
}
