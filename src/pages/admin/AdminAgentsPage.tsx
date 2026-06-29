import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check, X } from 'lucide-react'
import { approveAdminAgent, fetchAdminAgents, rejectAdminAgent, suspendAdminAgent } from '../../lib/api'
import { usePermission } from '../../hooks/usePermission'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { toast } from 'sonner'

interface AdminAgentRecord {
  public_id: string
  agency_name: string
  full_name: string
  email?: string | null
  tier: number
  status: StatusType
  created_at: string
}

function tierLabel(tier: number) {
  if (tier === 1) return 'Level 1 Agent'
  if (tier === 2) return 'Sub-Agent'
  if (tier === 3) return 'Sub-Sub-Agent'
  return `Tier ${tier}`
}

export default function AdminAgentsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = React.useState('')
  const [tierFilter, setTierFilter] = React.useState('')

  const canApprove = usePermission('agents', 'approve')
  const canSuspend = usePermission('agents', 'delete')

  const agentsQuery = useQuery({
    queryKey: ['admin', 'agents', { statusFilter, tierFilter }],
    queryFn: () =>
      fetchAdminAgents({
        perPage: 100,
        status: statusFilter || undefined,
        tier: tierFilter || undefined,
      }),
    staleTime: 30_000,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] })

  const approveMutation = useMutation({
    mutationFn: (publicId: string) => approveAdminAgent(publicId),
    onSuccess: () => {
      toast.success('Agent approved.')
      void invalidate()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to approve agent.')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ publicId, reason }: { publicId: string; reason: string }) => rejectAdminAgent(publicId, reason),
    onSuccess: () => {
      toast.success('Agent rejected.')
      void invalidate()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reject agent.')
    },
  })

  const suspendMutation = useMutation({
    mutationFn: ({ publicId, reason }: { publicId: string; reason: string }) => suspendAdminAgent(publicId, reason),
    onSuccess: () => {
      toast.success('Agent suspended.')
      void invalidate()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to suspend agent.')
    },
  })

  const columns: ColumnDef<AdminAgentRecord>[] = [
    {
      key: 'agency',
      header: 'Agency',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.agency_name}</p>
          <p className="text-xs text-muted-foreground">ID: {row.public_id} | {row.email || 'Email unavailable'}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Person',
      cell: (row) => <span className="text-brand-navy">{row.full_name}</span>,
    },
    {
      key: 'tier',
      header: 'Tier',
      cell: (row) => (
        <span className="text-[10px] uppercase font-bold text-brand-orange-accessible bg-brand-orange-accessible/10 px-2 py-0.5 rounded">
          {tierLabel(Number(row.tier))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'joined',
      header: 'Joined',
      cell: (row) => <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineActions
            actions={[
              {
                label: 'Approve Partner',
                icon: Check,
                onClick: () => approveMutation.mutate(row.public_id),
                hidden: !canApprove || row.status === 'approved',
              },
              {
                label: 'Reject Partner',
                icon: X,
                onClick: () => {
                  const reason = window.prompt('Enter rejection reason')
                  if (!reason?.trim()) {
                    return
                  }
                  rejectMutation.mutate({ publicId: row.public_id, reason: reason.trim() })
                },
                variant: 'danger',
                hidden: !canApprove || row.status !== 'pending',
              },
              {
                label: 'Suspend Partner',
                icon: Ban,
                onClick: () => {
                  const reason = window.prompt('Enter suspension reason')
                  if (!reason?.trim()) {
                    return
                  }
                  suspendMutation.mutate({ publicId: row.public_id, reason: reason.trim() })
                },
                variant: 'danger',
                hidden: !canSuspend || row.status === 'suspended',
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Agency Partners"
        subtitle="Manage live agent partner accounts, tiers, and approval flow."
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <div className="flex gap-2 flex-wrap w-full">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="">All Tiers</option>
            <option value="1">Level 1 Agent</option>
            <option value="2">Sub-Agent</option>
            <option value="3">Sub-Sub-Agent</option>
          </select>
        </div>
      </div>

      {agentsQuery.isError ? (
        <EmptyState
          icon={Ban}
          heading="Agents could not be loaded"
          description={agentsQuery.error instanceof Error ? agentsQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => agentsQuery.refetch()}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={(agentsQuery.data?.agents ?? []) as AdminAgentRecord[]}
          isLoading={agentsQuery.isLoading}
          emptyMessage="No agent partners match the current criteria."
        />
      )}
    </PageWrapper>
  )
}
