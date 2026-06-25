import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { Calendar, User, Globe, Edit, FileUp, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

interface AdminApplication {
  id: string
  referenceNumber: string
  studentName: string
  university: string
  course: string
  status: StatusType
  date: string
  intakeYear: number
}

const MOCK_APPLICATIONS: AdminApplication[] = [
  {
    id: 'app-201',
    referenceNumber: 'TGA-CAN-201',
    studentName: 'Amit Tiwari',
    university: 'University of Toronto',
    course: 'B.Sc. Computer Science',
    status: 'enrolled',
    date: '2026-02-10',
    intakeYear: 2026,
  },
  {
    id: 'app-202',
    referenceNumber: 'TGA-AUT-202',
    studentName: 'Jane Smith',
    university: 'Technical University of Vienna',
    course: 'M.Sc. Data Science',
    status: 'pending',
    date: '2026-03-01',
    intakeYear: 2026,
  }
]

export default function AdminApplicationsPage() {
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [univFilter, setUnivFilter] = React.useState('all')
  const [yearFilter, setYearFilter] = React.useState('all')

  const filteredApps = MOCK_APPLICATIONS.filter(app => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    const matchesUniv = univFilter === 'all' || app.university === univFilter
    const matchesYear = yearFilter === 'all' || app.intakeYear.toString() === yearFilter
    return matchesStatus && matchesUniv && matchesYear
  })

  const columns: ColumnDef<AdminApplication>[] = [
    {
      key: 'reference',
      header: 'Reference',
      cell: (row) => <span className="font-mono text-xs font-semibold text-brand-navy">{row.referenceNumber}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            {row.studentName}
          </p>
        </div>
      ),
    },
    {
      key: 'university',
      header: 'University & Course',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy flex items-center gap-1 text-xs">
            <Globe className="h-3 w-3 text-muted-foreground" />
            {row.university}
          </p>
          <p className="text-[10px] text-muted-foreground">{row.course}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'date',
      header: 'Submission Date',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {row.date}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineActions 
            actions={[
              { label: 'Change Status', icon: Edit, onClick: () => toast.success(`Status updated for ${row.referenceNumber}`) },
              { label: 'Request Document', icon: FileUp, onClick: () => toast.success(`Request sent for ${row.referenceNumber}`) },
              { label: 'Add Payment Record', icon: CreditCard, onClick: () => toast.success(`Payment popup for ${row.referenceNumber}`) },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Student Applications" 
        subtitle="Manage academic applications pipeline across the entire ecosystem."
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <div className="flex gap-2 flex-wrap w-full">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="enrolled">Enrolled</option>
            <option value="pending">Pending</option>
          </select>

          <select 
            value={univFilter}
            onChange={(e) => setUnivFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="all">All Universities</option>
            <option value="University of Toronto">University of Toronto</option>
            <option value="Technical University of Vienna">Technical University of Vienna</option>
          </select>

          <select 
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full sm:w-36 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="all">All Years</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredApps}
        emptyMessage="No applications match the filters."
      />
    </PageWrapper>
  )
}
