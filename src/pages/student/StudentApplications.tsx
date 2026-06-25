import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { 
  PreviewDrawer, 
  PreviewDrawerContent, 
  PreviewDrawerHeader, 
  PreviewDrawerBody, 
  PreviewDrawerFooter 
} from '../../shared/components/ui/PreviewDrawer'
import { Calendar, GraduationCap, MapPin, DollarSign } from 'lucide-react'

interface StudentApplication {
  id: string
  university: string
  course: string
  intake: string
  status: StatusType
  appliedDate: string
}

const MOCK_APPLICATIONS: StudentApplication[] = [
  {
    id: 'app-1',
    university: 'University of Toronto',
    course: 'B.Sc. Computer Science',
    intake: 'Sept 2026',
    status: 'under_review',
    appliedDate: '2026-02-15',
  },
  {
    id: 'app-2',
    university: 'University of British Columbia',
    course: 'B.Sc. Software Engineering',
    intake: 'Sept 2026',
    status: 'pending',
    appliedDate: '2026-03-01',
  }
]

export default function StudentApplications() {
  const [selectedApp, setSelectedApp] = React.useState<StudentApplication | null>(null)

  const columns: ColumnDef<StudentApplication>[] = [
    {
      key: 'university',
      header: 'University',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.university}</p>
          <p className="text-xs text-muted-foreground">ID: {row.id}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      cell: (row) => <span className="text-brand-navy">{row.course}</span>,
    },
    {
      key: 'intake',
      header: 'Intake',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {row.intake}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'appliedDate',
      header: 'Applied Date',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.appliedDate}</span>,
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="My Applications" 
        subtitle="Track the status of your university applications."
        actions={<Button variant="primary">New Application</Button>}
      />

      <DataTable 
        columns={columns} 
        data={MOCK_APPLICATIONS} 
        onRowClick={(row) => setSelectedApp(row)}
        emptyMessage="No applications yet. Browse universities to apply."
      />

      <PreviewDrawer open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <PreviewDrawerContent>
          {selectedApp && (
            <>
              <PreviewDrawerHeader 
                title={selectedApp.university}
                badge={<StatusBadge status={selectedApp.status} />}
              />
              <PreviewDrawerBody>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Course Details
                    </h4>
                    <div className="flex items-start gap-3">
                      <GraduationCap className="h-5 w-5 text-brand-orange-accessible mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-brand-navy">{selectedApp.course}</p>
                        <p className="text-xs text-muted-foreground">Undergraduate degree</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Intake & Terms
                    </h4>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-brand-navy mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-brand-navy">{selectedApp.intake} Intake</p>
                        <p className="text-xs text-muted-foreground">Deadline: July 1, 2026</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Location & Fees
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-brand-navy">Canada</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-brand-navy">$35,000 CAD / Year</span>
                      </div>
                    </div>
                  </div>
                </div>
              </PreviewDrawerBody>
              <PreviewDrawerFooter detailUrl={`/portal/student/applications/${selectedApp.id}`} />
            </>
          )}
        </PreviewDrawerContent>
      </PreviewDrawer>
    </PageWrapper>
  )
}
