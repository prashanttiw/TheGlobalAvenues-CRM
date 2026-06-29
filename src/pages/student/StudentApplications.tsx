import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { Badge, StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import {
  PreviewDrawer,
  PreviewDrawerBody,
  PreviewDrawerContent,
  PreviewDrawerFooter,
  PreviewDrawerHeader,
} from '../../shared/components/ui/PreviewDrawer'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { Button } from '../../shared/components/ui/Button'
import { AlertTriangle, Calendar, GraduationCap } from 'lucide-react'
import { fetchStudentApplicationsList } from '../../lib/api'

interface StudentApplication {
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
  return new Date(value || Date.now()).toLocaleDateString()
}

export default function StudentApplications() {
  const [selectedApp, setSelectedApp] = React.useState<StudentApplication | null>(null)

  const applicationsQuery = useQuery({
    queryKey: ['student', 'applications'],
    queryFn: fetchStudentApplicationsList,
    staleTime: 30_000,
  })

  const columns: ColumnDef<StudentApplication>[] = [
    {
      key: 'university',
      header: 'University',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.university_name}</p>
          <p className="text-xs text-muted-foreground">Ref: {row.reference_number}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      cell: (row) => <span className="text-brand-navy">{row.course_name}</span>,
    },
    {
      key: 'intake',
      header: 'Intake',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {row.intake_name || `${row.intake_month}/${row.intake_year}`}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => renderStatus(row.status),
    },
    {
      key: 'appliedDate',
      header: 'Applied Date',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.submitted_at || row.created_at)}</span>,
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader title="My Applications" subtitle="Track the status of your real university applications." />

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
          data={(applicationsQuery.data as StudentApplication[] | undefined) ?? []}
          isLoading={applicationsQuery.isLoading}
          onRowClick={(row) => setSelectedApp(row)}
          emptyMessage="No applications yet. Browse universities to apply."
        />
      )}

      <PreviewDrawer open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <PreviewDrawerContent>
          {selectedApp ? (
            <>
              <PreviewDrawerHeader title={selectedApp.university_name} badge={renderStatus(selectedApp.status)} />
              <PreviewDrawerBody>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Application Reference</h4>
                    <p className="font-mono text-sm text-brand-navy">{selectedApp.reference_number}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Course Details</h4>
                    <div className="flex items-start gap-3">
                      <GraduationCap className="h-5 w-5 text-brand-orange-accessible mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-brand-navy">{selectedApp.course_name}</p>
                        <p className="text-xs text-muted-foreground">{selectedApp.course_level}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Intake & Dates</h4>
                    <div className="space-y-2 text-sm text-brand-navy">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedApp.intake_name || `${selectedApp.intake_month}/${selectedApp.intake_year}`}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Created on {formatDate(selectedApp.created_at)}</div>
                      <div className="text-xs text-muted-foreground">Submitted on {formatDate(selectedApp.submitted_at || selectedApp.created_at)}</div>
                    </div>
                  </div>
                </div>
              </PreviewDrawerBody>
              <PreviewDrawerFooter detailUrl={`/portal/student/applications/${selectedApp.public_id}`} />
            </>
          ) : null}
        </PreviewDrawerContent>
      </PreviewDrawer>
    </PageWrapper>
  )
}
