import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchAdminStudents } from '../../lib/api'
import { usePermission } from '../../hooks/usePermission'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Button } from '../../shared/components/ui/Button'
import { Badge, StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { SearchInput } from '../../shared/components/ui/SearchInput'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { UserAvatar } from '../../shared/components/ui/Avatar'
import {
  PreviewDrawer,
  PreviewDrawerContent,
  PreviewDrawerHeader,
  PreviewDrawerBody,
  PreviewDrawerFooter,
} from '../../shared/components/ui/PreviewDrawer'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { CustomFieldsManagerPanel } from '../../shared/components/students/CustomFieldsManagerPanel'
import { useUrlFilters } from '../../shared/hooks/useUrlFilters'
import { ClearFiltersButton } from '../../shared/components/ui/ClearFiltersButton'
import { Calendar, Edit, Eye, FileUp, Globe, ListPlus, Mail, Phone, User, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

interface AdminStudent {
  id: string
  public_id: string
  name: string
  email?: string | null
  phone?: string | null
  nationality?: string | null
  agent: string
  status: string
  applicationsCount: number
  registeredDate: string
  avatar_url?: string | null
  avatar_thumb_url?: string | null
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

function renderStatus(status: string) {
  return KNOWN_STATUSES.has(status as StatusType) ? (
    <StatusBadge status={status as StatusType} />
  ) : (
    <Badge variant="secondary">{status.replace(/_/g, ' ')}</Badge>
  )
}

export default function AdminStudentsPage() {
  const navigate = useNavigate()
  const { filters, setFilter, clearFilters, hasActiveFilters } = useUrlFilters({
    search: '', status: '', agent: '',
  })
  const searchTerm = filters.search
  const statusFilter = filters.status
  const agentFilter = filters.agent
  const setSearchTerm = (v: string) => setFilter('search', v)
  const setStatusFilter = (v: string) => setFilter('status', v)
  const setAgentFilter = (v: string) => setFilter('agent', v)
  const [selectedStudent, setSelectedStudent] = React.useState<AdminStudent | null>(null)
  const [isManageFieldsOpen, setIsManageFieldsOpen] = React.useState(false)

  const canEdit = usePermission('students', 'edit')
  const canReassign = usePermission('students', 'reassign')

  const studentsQuery = useQuery({
    queryKey: ['admin', 'students', { searchTerm, statusFilter, agentFilter }],
    queryFn: () =>
      fetchAdminStudents({
        perPage: 100,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        agentScope: agentFilter || undefined,
      }),
    staleTime: 30_000,
  })

  const columns: ColumnDef<AdminStudent>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={row.name} image={row.avatar_thumb_url ?? undefined} size="sm" />
          <div>
            <p className="font-semibold text-brand-navy">{row.name}</p>
            <p className="text-xs text-muted-foreground">ID: {row.id} | {row.email || 'Email unavailable'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'nationality',
      header: 'Nationality',
      cell: (row) => <span className="text-brand-navy">{row.nationality || 'Not set'}</span>,
    },
    {
      key: 'agent',
      header: 'Agent',
      cell: (row) => <span className="text-brand-navy font-medium text-xs">{row.agent}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => renderStatus(row.status),
    },
    {
      key: 'applications',
      header: 'Applications',
      cell: (row) => <span className="text-brand-navy font-semibold">{row.applicationsCount}</span>,
    },
    {
      key: 'registered',
      header: 'Registered',
      cell: (row) => <span className="text-xs text-muted-foreground">{new Date(row.registeredDate).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineActions
            actions={[
              { label: 'View Full Profile', icon: Eye, onClick: () => navigate(`/portal/admin/students/${row.public_id}`) },
              { label: 'Request Document', icon: FileUp, onClick: () => toast.success(`Use application-level document requests for ${row.name}.`) },
              { label: 'Edit Student Details', icon: Edit, onClick: () => toast.success(`Live edit flow is not wired on this page yet for ${row.name}.`), hidden: !canEdit },
              { label: 'Reassign Agent', icon: UserCheck, onClick: () => navigate(`/portal/admin/reassignments?student=${encodeURIComponent(row.name)}`), hidden: !canReassign },
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
        subtitle="Manage real student records across the portal pipeline."
        actions={
          canEdit ? (
            <Button variant="secondary" onClick={() => setIsManageFieldsOpen(true)}>
              <ListPlus className="mr-2 h-4 w-4" />
              Manage Custom Fields
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 justify-between items-center bg-surface-card p-4 rounded-xl border border-border-warm">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by name, ID, email, or phone (from the start)..."
          className="w-full sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="registered">Registered</option>
            <option value="profile_complete">Profile Complete</option>
            <option value="application_submitted">Application Submitted</option>
            <option value="offer_received">Offer Received</option>
            <option value="enrolled">Enrolled</option>
          </select>

          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="">All Agents</option>
            <option value="direct">Direct Students</option>
            <option value="assigned">Agent Assisted</option>
          </select>
          {hasActiveFilters && <ClearFiltersButton className="" onClick={clearFilters} />}
        </div>
      </div>

      {studentsQuery.isError ? (
        <EmptyState
          icon={User}
          heading="Students could not be loaded"
          description={studentsQuery.error instanceof Error ? studentsQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => studentsQuery.refetch()}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={(studentsQuery.data?.students ?? []) as AdminStudent[]}
          isLoading={studentsQuery.isLoading}
          onRowClick={(row) => setSelectedStudent(row)}
          emptyMessage="No students match the current filters."
        />
      )}

      <PreviewDrawer open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <PreviewDrawerContent>
          {selectedStudent && (
            <>
              <PreviewDrawerHeader
                title={selectedStudent.name}
                badge={renderStatus(selectedStudent.status)}
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
                        <span className="text-sm text-brand-navy">{selectedStudent.email || 'Not available'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-brand-navy">{selectedStudent.phone || 'Not available'}</span>
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
                        <span className="text-sm text-brand-navy">Nationality: {selectedStudent.nationality || 'Not set'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-brand-navy">Registered: {new Date(selectedStudent.registeredDate).toLocaleDateString()}</span>
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

      <SlideOverPanel title="Manage Custom Fields" open={isManageFieldsOpen} onOpenChange={setIsManageFieldsOpen}>
        <CustomFieldsManagerPanel />
      </SlideOverPanel>
    </PageWrapper>
  )
}
