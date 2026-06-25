import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { Calendar, User, Globe, ShieldAlert, Check, X, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { usePermission } from '../../hooks/usePermission'

interface AdminAgent {
  id: string
  agencyName: string
  contactName: string
  email: string
  tier: 'Level 1 Agent' | 'Sub-Agent' | 'Sub-Sub-Agent'
  studentsCount: number
  status: StatusType
  joinedDate: string
}

const MOCK_AGENTS: AdminAgent[] = [
  {
    id: 'agt-301',
    agencyName: 'Global Education Partners',
    contactName: 'Sarah Johnson',
    email: 'sarah@gepartners.com',
    tier: 'Level 1 Agent',
    studentsCount: 12,
    status: 'approved',
    joinedDate: '2026-01-10',
  },
  {
    id: 'agt-302',
    agencyName: 'EduGlobal Consultants',
    contactName: 'Vikas Sharma',
    email: 'vikas@eduglobal.com',
    tier: 'Sub-Agent',
    studentsCount: 4,
    status: 'pending',
    joinedDate: '2026-03-15',
  }
]

export default function AdminAgentsPage() {
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [tierFilter, setTierFilter] = React.useState('all')

  const canApprove = usePermission('agents', 'approve')
  const canSuspend = usePermission('agents', 'suspend')

  const filteredAgents = MOCK_AGENTS.filter(a => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    const matchesTier = tierFilter === 'all' || a.tier === tierFilter
    return matchesStatus && matchesTier
  })

  const columns: ColumnDef<AdminAgent>[] = [
    {
      key: 'agency',
      header: 'Agency',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.agencyName}</p>
          <p className="text-xs text-muted-foreground">ID: {row.id} • {row.email}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Person',
      cell: (row) => <span className="text-brand-navy">{row.contactName}</span>,
    },
    {
      key: 'tier',
      header: 'Tier',
      cell: (row) => (
        <span className="text-[10px] uppercase font-bold text-brand-orange-accessible bg-brand-orange-accessible/10 px-2 py-0.5 rounded">
          {row.tier}
        </span>
      ),
    },
    {
      key: 'students',
      header: 'Students',
      cell: (row) => <span className="text-brand-navy font-semibold">{row.studentsCount}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'joined',
      header: 'Joined',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.joinedDate}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineActions 
            actions={[
              { label: 'Approve Partner', icon: Check, onClick: () => toast.success(`Approved ${row.agencyName}`), hidden: !canApprove || row.status === 'approved' },
              { label: 'Reject Partner', icon: X, onClick: () => toast.success(`Rejected ${row.agencyName}`), variant: 'danger', hidden: !canApprove || row.status !== 'pending' },
              { label: 'Suspend Partner', icon: Ban, onClick: () => toast.success(`Suspended ${row.agencyName}`), variant: 'danger', hidden: !canSuspend || row.status === 'suspended' },
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
        subtitle="Manage agent partner accounts, tiers, and validation requests."
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <div className="flex gap-2 flex-wrap w-full">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>

          <select 
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="all">All Tiers</option>
            <option value="Level 1 Agent">Level 1 Agent</option>
            <option value="Sub-Agent">Sub-Agent</option>
            <option value="Sub-Sub-Agent">Sub-Sub-Agent</option>
          </select>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredAgents}
        emptyMessage="No agent partners match the current criteria."
      />
    </PageWrapper>
  )
}
