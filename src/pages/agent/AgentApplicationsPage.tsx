import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Calendar, User, Globe } from 'lucide-react'

interface NetworkApplication {
  id: string
  studentName: string
  university: string
  course: string
  status: StatusType
  referenceNumber: string
  appliedDate: string
  submittedBy: string // Direct or via a sub-agent
}

const MOCK_APPLICATIONS: NetworkApplication[] = [
  {
    id: 'app-501',
    studentName: 'Prashant Tiwari',
    university: 'University of Toronto',
    course: 'B.Sc. Computer Science',
    status: 'under_review',
    referenceNumber: 'TGA-CAN-501',
    appliedDate: '2026-02-15',
    submittedBy: 'Direct',
  },
  {
    id: 'app-502',
    studentName: 'Amit Shah',
    university: 'Technical University of Vienna',
    course: 'M.Sc. Data Science',
    status: 'offer_received',
    referenceNumber: 'TGA-AUT-502',
    appliedDate: '2026-03-01',
    submittedBy: 'Rajesh Kumar (Sub-Agent)',
  }
]

export default function AgentApplicationsPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [subagentFilter, setSubagentFilter] = React.useState<string>('all')

  const filteredApps = MOCK_APPLICATIONS.filter(app => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    const matchesSubagent = subagentFilter === 'all' || 
                             (subagentFilter === 'direct' && app.submittedBy === 'Direct') ||
                             (subagentFilter === 'subagent' && app.submittedBy !== 'Direct')
    return matchesStatus && matchesSubagent
  })

  const columns: ColumnDef<NetworkApplication>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            {row.studentName}
          </p>
          <p className="text-[10px] text-muted-foreground">Via {row.submittedBy}</p>
        </div>
      ),
    },
    {
      key: 'university',
      header: 'University',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy flex items-center gap-1">
            <Globe className="h-3 w-3 text-muted-foreground" />
            {row.university}
          </p>
          <p className="text-xs text-muted-foreground">{row.course}</p>
        </div>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      cell: (row) => <span className="font-mono text-xs text-brand-navy">{row.referenceNumber}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'date',
      header: 'Applied Date',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {row.appliedDate}
        </span>
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Network Applications" 
        subtitle="Track student application statuses across your entire network hierarchy." 
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <div className="flex flex-1 gap-2 flex-col sm:flex-row w-full">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="under_review">Under Review</option>
            <option value="offer_received">Offer Received</option>
            <option value="pending">Pending</option>
          </select>
          
          <select 
            value={subagentFilter}
            onChange={(e) => setSubagentFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="all">All Network</option>
            <option value="direct">Direct Students</option>
            <option value="subagent">Sub-Agent Students</option>
          </select>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredApps}
        emptyMessage="No student applications found in this segment."
      />
    </PageWrapper>
  )
}
