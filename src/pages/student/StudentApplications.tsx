import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
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
import { AlertTriangle, Calendar, CreditCard, FileText, GraduationCap, GripVertical, XCircle } from 'lucide-react'
import { fetchStudentApplicationDetail, fetchStudentApplicationsList, markPaymentPaid, reorderApplicationPreferences, studentWithdrawApplication } from '../../lib/api'

interface StudentApplication {
  public_id: string
  reference_number: string
  status: string
  submitted_at?: string | null
  created_at: string
  preference_rank?: number | null
  intake_name: string
  intake_month: number
  intake_year: number
  course_name: string
  course_level: string
  university_name: string
}

const TERMINAL_STATUSES = new Set(['withdrawn', 'rejected'])

function PreferenceRow({ application, rank }: { application: StudentApplication; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: application.public_id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-card border border-border-warm bg-surface-card p-3 shadow-sm transition-colors hover:border-brand-orange-accessible/25 hover:bg-brand-orange-accessible/5">
      <button {...attributes} {...listeners} className="shrink-0 cursor-grab rounded-button p-1 text-muted-foreground transition-colors hover:bg-surface-warm hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible" title="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange-accessible text-xs font-bold text-white">{rank}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-brand-navy">{application.university_name}</p>
        <p className="truncate text-xs text-muted-foreground">{application.course_name} · {application.intake_name || `${application.intake_month}/${application.intake_year}`}</p>
      </div>
      <StatusBadge status={application.status as StatusType} />
    </div>
  )
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

function formatDate(value?: string | null) {
  return new Date(value || Date.now()).toLocaleDateString()
}

export default function StudentApplications() {
  const queryClient = useQueryClient()
  const [selectedPid, setSelectedPid] = React.useState<string | null>(null)

  const applicationsQuery = useQuery({
    queryKey: ['student', 'applications'],
    queryFn: fetchStudentApplicationsList,
    staleTime: 30_000,
  })

  const detailQuery = useQuery({
    queryKey: ['student', 'applications', selectedPid],
    queryFn: () => fetchStudentApplicationDetail(selectedPid as string),
    enabled: !!selectedPid,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['student', 'applications'] })
  }

  const withdrawMutation = useMutation({
    mutationFn: ({ pid, reason }: { pid: string; reason: string }) => studentWithdrawApplication(pid, reason),
    onSuccess: () => {
      toast.success('Application withdrawn.')
      invalidate()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to withdraw application.'),
  })

  const markPaidMutation = useMutation({
    mutationFn: (pid: string) => markPaymentPaid(pid),
    onSuccess: () => {
      toast.success("Marked as paid — we'll confirm with the university shortly.")
      invalidate()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update payment.'),
  })

  const activeApplications = React.useMemo(() => {
    const rows = (applicationsQuery.data as StudentApplication[] | undefined) ?? []
    return rows.filter((row) => !TERMINAL_STATUSES.has(row.status))
  }, [applicationsQuery.data])

  const [orderedIds, setOrderedIds] = React.useState<string[]>([])
  React.useEffect(() => {
    setOrderedIds(activeApplications.map((a) => a.public_id))
  }, [activeApplications])

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) => reorderApplicationPreferences(order),
    onSuccess: () => invalidate(),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder preferences.')
      invalidate()
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = orderedIds.indexOf(String(active.id))
    const newIndex = orderedIds.indexOf(String(over.id))
    const next = arrayMove(orderedIds, oldIndex, newIndex)
    setOrderedIds(next)
    reorderMutation.mutate(next)
  }

  const orderedActiveApplications = orderedIds
    .map((id) => activeApplications.find((a) => a.public_id === id))
    .filter((a): a is StudentApplication => !!a)

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

  const detail = detailQuery.data
  const canWithdraw = detail && !['withdrawn', 'enrolled', 'rejected'].includes(detail.status)

  return (
    <PageWrapper className="space-y-6 sm:space-y-8">
      <PageHeader title="My Applications" subtitle="Track the status of your real university applications." />

      {orderedActiveApplications.length > 1 && (
        <Card>
          <CardHeader className="border-b border-border-warm pb-3">
            <CardTitle className="text-base font-semibold text-brand-navy">Your Preference Order</CardTitle>
            <p className="text-xs text-muted-foreground">Drag to rank your active applications — this is for your own planning and is visible to your consultant.</p>
          </CardHeader>
          <CardContent className="pt-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {orderedActiveApplications.map((application, index) => (
                    <PreferenceRow key={application.public_id} application={application} rank={index + 1} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}

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
          onRowClick={(row) => setSelectedPid(row.public_id)}
          emptyMessage="No applications yet. Browse universities to apply."
        />
      )}

      <PreviewDrawer open={!!selectedPid} onOpenChange={(open) => !open && setSelectedPid(null)}>
        <PreviewDrawerContent>
          {detailQuery.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading application�</div>
          ) : detail ? (
            <>
              <PreviewDrawerHeader title={detail.university_name} badge={renderStatus(detail.status)}>
                <p className="text-xs text-muted-foreground font-mono">{detail.reference_number}</p>
              </PreviewDrawerHeader>
              <PreviewDrawerBody>
                <div className="space-y-6">
                  <div className="rounded-card border border-border-warm bg-surface-card p-4 shadow-sm">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course Details</h4>
                    <div className="flex items-start gap-3">
                      <GraduationCap className="h-5 w-5 text-brand-orange-accessible mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-brand-navy">{detail.program_name}</p>
                        <p className="text-xs text-muted-foreground">{detail.degree_level} · {detail.intake_name}</p>
                        {detail.tuition_fee_amount && (
                          <p className="text-xs text-muted-foreground mt-1">Tuition: {detail.tuition_fee_currency} {detail.tuition_fee_amount}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {(detail.document_requests ?? []).length > 0 && (
                    <div className="rounded-card border border-border-warm bg-surface-card p-4 shadow-sm">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document Requests</h4>
                      <div className="space-y-2">
                        {detail.document_requests.map((doc: any) => (
                          <div key={doc.public_id} className="flex items-center justify-between gap-3 rounded-button border border-border-warm bg-surface-warm/50 p-3">
                            <div>
                              <p className="text-sm font-medium text-brand-navy flex items-center gap-1"><FileText className="h-3 w-3" />{doc.doc_label}</p>
                              <p className="text-[10px] text-muted-foreground">{formatStatusLabel(doc.status)}{doc.deadline ? ` · Due ${formatDate(doc.deadline)}` : ''}</p>
                            </div>
                            {(doc.status === 'requested' || doc.status === 'rejected') && (
                              <Button size="sm" variant="secondary" onClick={() => { window.location.href = '/portal/student/documents' }}>Upload</Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(detail.payments ?? []).length > 0 && (
                    <div className="rounded-card border border-border-warm bg-surface-card p-4 shadow-sm">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payments</h4>
                      <div className="space-y-2">
                        {detail.payments.map((payment: any) => (
                          <div key={payment.public_id} className="flex items-center justify-between gap-3 rounded-button border border-border-warm bg-surface-warm/50 p-3">
                            <div>
                              <p className="text-sm font-medium text-brand-navy flex items-center gap-1"><CreditCard className="h-3 w-3" />{payment.label}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {payment.amount ? `${payment.currency} ${payment.amount} · ` : ''}{formatStatusLabel(payment.status)}
                                {payment.due_date ? ` · Due ${formatDate(payment.due_date)}` : ''}
                              </p>
                              {payment.payment_link && (
                                <a href={payment.payment_link} target="_blank" rel="noreferrer" className="text-[11px] text-brand-orange-accessible font-semibold">
                                  Open payment link →
                                </a>
                              )}
                            </div>
                            {payment.status === 'pending' && (
                              <Button size="sm" onClick={() => markPaidMutation.mutate(payment.public_id)} disabled={markPaidMutation.isPending}>
                                I've Paid
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-card border border-border-warm bg-surface-card p-4 shadow-sm">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h4>
                    {(detail.history ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No activity yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.history.map((item: any, idx: number) => (
                          <div key={idx} className="text-xs border-l-2 border-brand-orange-accessible/40 pl-3 py-1">
                            <p className="text-brand-navy whitespace-pre-line">{item.content}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(item.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {canWithdraw && (
                    <Button
                      variant="secondary"
                      className="text-red-600 w-full"
                      onClick={() => {
                        const reason = window.prompt('Reason for withdrawing this application')
                        if (reason === null) return
                        withdrawMutation.mutate({ pid: detail.public_id, reason })
                      }}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Withdraw Application
                    </Button>
                  )}
                </div>
              </PreviewDrawerBody>
              <PreviewDrawerFooter />
            </>
          ) : (
            <div className="p-6 text-sm font-medium text-destructive">Application could not be loaded.</div>
          )}
        </PreviewDrawerContent>
      </PreviewDrawer>
    </PageWrapper>
  )
}
