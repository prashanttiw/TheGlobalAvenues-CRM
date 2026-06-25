import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { SearchInput } from '../../shared/components/ui/SearchInput'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { 
  PreviewDrawer, 
  PreviewDrawerContent, 
  PreviewDrawerHeader, 
  PreviewDrawerBody, 
  PreviewDrawerFooter 
} from '../../shared/components/ui/PreviewDrawer'
import { User, Globe, Mail, Phone, Calendar, Eye, FileUp, Edit, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { usePermission } from '../../hooks/usePermission'

interface AdminStudent {
  id: string
  name: string
  email: string
  phone: string
  nationality: string
  agent: string
  status: StatusType
  applicationsCount: number
  registeredDate: string
}

const MOCK_STUDENTS: AdminStudent[] = [
  {
    id: 'std-201',
    name: 'Amit Tiwari',
    email: 'amit@example.com',
    phone: '+91 98765 43210',
    nationality: 'Indian',
    agent: 'Global Education Partners',
    status: 'enrolled',
    applicationsCount: 2,
    registeredDate: '2026-01-05',
  },
  {
    id: 'std-202',
    name: 'Sarah Connor',
    email: 'sarah.connor@sky.net',
    phone: '+1 415 555 1984',
    nationality: 'American',
    agent: 'None (Direct)',
    status: 'pending',
    applicationsCount: 1,
    registeredDate: '2026-03-12',
  }
]

export default function AdminStudentsPage() {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [agentFilter, setAgentFilter] = React.useState('all')
  const [selectedStudent, setSelectedStudent] = React.useState<AdminStudent | null>(null)

  const canEdit = usePermission('students', 'edit')
  const canReassign = usePermission('students', 'reassign')

  const filteredStudents = MOCK_STUDENTS.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    const matchesAgent = agentFilter === 'all' || 
                         (agentFilter === 'direct' && s.agent === 'None (Direct)') ||
                         (agentFilter === 'assigned' && s.agent !== 'None (Direct)')
    return matchesSearch && matchesStatus && matchesAgent
  })

  const columns: ColumnDef<AdminStudent>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.name}</p>
          <p className="text-xs text-muted-foreground">ID: {row.id} • {row.email}</p>
        </div>
      ),
    },
    {
      key: 'nationality',
      header: 'Nationality',
      cell: (row) => <span className="text-brand-navy">{row.nationality}</span>,
    },
    {
      key: 'agent',
      header: 'Agent',
      cell: (row) => <span className="text-brand-navy font-medium text-xs">{row.agent}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'applications',
      header: 'Applications',
      cell: (row) => <span className="text-brand-navy font-semibold">{row.applicationsCount}</span>,
    },
    {
      key: 'registered',
      header: 'Registered',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.registeredDate}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineActions 
            actions={[
              { label: 'View Full Profile', icon: Eye, onClick: () => setSelectedStudent(row) },
              { label: 'Request Document', icon: FileUp, onClick: () => toast.success(`Document requested from ${row.name}`) },
              { label: 'Edit Student Details', icon: Edit, onClick: () => toast.success(`Edit modal for ${row.name}`), hidden: !canEdit },
              { label: 'Reassign Agent', icon: UserCheck, onClick: () => toast.success(`Agent reassignment for ${row.name}`), hidden: !canReassign },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Students Directory" 
        subtitle="Manage all students in the pipeline."
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface-card p-4 rounded-xl border border-border-warm">
        <SearchInput 
          value={searchTerm} 
          onChange={setSearchTerm} 
          placeholder="Search by name or email..." 
          className="w-full sm:max-w-xs"
        />
        <div className="flex gap-2 w-full sm:w-auto">
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
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="all">All Agents</option>
            <option value="direct">Direct Students</option>
            <option value="assigned">Agent Assisted</option>
          </select>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredStudents}
        onRowClick={(row) => setSelectedStudent(row)}
        emptyMessage="No students match the current filters."
      />

      <PreviewDrawer open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <PreviewDrawerContent>
          {selectedStudent && (
            <>
              <PreviewDrawerHeader 
                title={selectedStudent.name}
                badge={<StatusBadge status={selectedStudent.status} />}
              />
              <PreviewDrawerBody>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Contact Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-brand-navy">{selectedStudent.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-brand-navy">{selectedStudent.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Assigned Agent
                    </h4>
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-brand-orange-accessible" />
                      <span className="text-sm text-brand-navy font-medium">{selectedStudent.agent}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      System Details
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-brand-navy">Nationality: {selectedStudent.nationality}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-brand-navy">Registered: {selectedStudent.registeredDate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </PreviewDrawerBody>
              <PreviewDrawerFooter detailUrl={`/portal/admin/students/${selectedStudent.id}`} />
            </>
          )}
        </PreviewDrawerContent>
      </PreviewDrawer>
    </PageWrapper>
  )
}
