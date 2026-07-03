import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, FileUp, Plus, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  adminCancelDocumentRequest,
  adminResolvePayment,
  adminReviewDocumentRequest,
  adminVerifyPayment,
  adminWithdrawApplication,
  createAdminApplicationDocumentRequest,
  createAdminApplicationPaymentRequest,
  fetchAdminApplicationByPublicId,
  updateAdminApplicationStatus,
} from '../../../lib/api'
import { Badge, StatusBadge, type StatusType } from '../ui/Badge'
import { Button } from '../ui/Button'
import { PreviewDrawer, PreviewDrawerBody, PreviewDrawerContent, PreviewDrawerHeader } from '../ui/PreviewDrawer'
import { usePermission } from '../../../hooks/usePermission'

// Mirrors crm-api/Services/StateManager.php::GRAPH exactly so admins can only attempt
// transitions the backend will actually accept.
const STATUS_GRAPH: Record<string, string[]> = {
  inquiry: ['profile_review', 'applied', 'withdrawn'],
  profile_review: ['applied', 'documents_submitted', 'under_review', 'withdrawn'],
  applied: ['documents_submitted', 'under_review', 'withdrawn'],
  documents_submitted: ['under_review', 'withdrawn'],
  draft: ['submitted', 'withdrawn'],
  submitted: ['under_review', 'withdrawn'],
  under_review: ['offer_received', 'conditional_offer', 'unconditional_offer', 'waitlisted', 'rejected', 'withdrawn'],
  offer_received: ['enrolled', 'rejected', 'withdrawn', 'deferred'],
  conditional_offer: ['enrolled', 'unconditional_offer', 'rejected', 'withdrawn', 'deferred'],
  unconditional_offer: ['enrolled', 'rejected', 'withdrawn', 'deferred'],
  waitlisted: ['submitted', 'offer_received', 'conditional_offer', 'unconditional_offer', 'rejected', 'withdrawn'],
  enrolled: ['cas_coe_issued', 'deferred', 'withdrawn', 'rejected'],
  cas_coe_issued: ['visa_applied', 'deferred', 'withdrawn', 'rejected'],
  visa_applied: ['visa_approved', 'visa_rejected', 'deferred', 'withdrawn', 'rejected'],
  visa_approved: ['pre_departure', 'deferred', 'withdrawn'],
  visa_rejected: ['visa_applied', 'deferred', 'withdrawn', 'rejected'],
  pre_departure: ['departed', 'deferred', 'withdrawn'],
  departed: ['deferred', 'withdrawn'],
  deferred: ['submitted', 'under_review', 'withdrawn'],
  rejected: ['submitted', 'under_review'],
  withdrawn: ['submitted', 'draft'],
}

const KNOWN_STATUSES = new Set<StatusType>([
  'registered', 'pending', 'approved', 'rejected', 'suspended', 'enrolled',
  'draft', 'submitted', 'under_review', 'offer_received', 'paid', 'confirmed',
])

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function renderApplicationStatus(status: string) {
  return KNOWN_STATUSES.has(status as StatusType) ? (
    <StatusBadge status={status as StatusType} />
  ) : (
    <Badge variant="secondary">{formatStatusLabel(status)}</Badge>
  )
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString()
}

const inputClass =
  'w-full px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none'

interface ApplicationDetailDrawerProps {
  applicationPid: string | null
  onOpenChange: (open: boolean) => void
  onMutated?: () => void
}

export function ApplicationDetailDrawer({ applicationPid, onOpenChange, onMutated }: ApplicationDetailDrawerProps) {
  const queryClient = useQueryClient()
  const canWrite = usePermission('applications', 'edit')
  const [showDocForm, setShowDocForm] = React.useState(false)
  const [showPaymentForm, setShowPaymentForm] = React.useState(false)
  const [docForm, setDocForm] = React.useState({ doc_label: '', description: '', deadline: '' })
  const [paymentForm, setPaymentForm] = React.useState({ label: '', amount: '', currency: 'EUR', payment_link: '', due_date: '' })

  const detailQuery = useQuery({
    queryKey: ['admin', 'applications', applicationPid],
    queryFn: () => fetchAdminApplicationByPublicId(applicationPid as string),
    enabled: !!applicationPid,
  })

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] })
    onMutated?.()
  }

  const statusMutation = useMutation({
    mutationFn: ({ publicId, status }: { publicId: string; status: string }) => updateAdminApplicationStatus(publicId, status),
    onSuccess: () => { toast.success('Application status updated.'); invalidateAll() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update application status.'),
  })

  const withdrawMutation = useMutation({
    mutationFn: ({ publicId, reason }: { publicId: string; reason: string }) => adminWithdrawApplication(publicId, reason),
    onSuccess: () => { toast.success('Application withdrawn.'); invalidateAll() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to withdraw application.'),
  })

  const documentMutation = useMutation({
    mutationFn: ({ publicId, payload }: { publicId: string; payload: { doc_label: string; description?: string; deadline?: string } }) =>
      createAdminApplicationDocumentRequest(publicId, payload),
    onSuccess: () => {
      toast.success('Document request created.')
      setShowDocForm(false)
      setDocForm({ doc_label: '', description: '', deadline: '' })
      invalidateAll()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create document request.'),
  })

  const reviewDocMutation = useMutation({
    mutationFn: ({ pid, status, reason }: { pid: string; status: 'approved' | 'rejected'; reason?: string }) =>
      adminReviewDocumentRequest(pid, { status, rejection_reason: reason }),
    onSuccess: () => { toast.success('Document request reviewed.'); invalidateAll() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to review document request.'),
  })

  const cancelDocMutation = useMutation({
    mutationFn: (pid: string) => adminCancelDocumentRequest(pid),
    onSuccess: () => { toast.success('Document request cancelled.'); invalidateAll() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to cancel document request.'),
  })

  const paymentMutation = useMutation({
    mutationFn: ({ publicId, payload }: { publicId: string; payload: { label: string; amount?: number; currency?: string; payment_link?: string; due_date?: string } }) =>
      createAdminApplicationPaymentRequest(publicId, payload),
    onSuccess: () => {
      toast.success('Payment request created.')
      setShowPaymentForm(false)
      setPaymentForm({ label: '', amount: '', currency: 'EUR', payment_link: '', due_date: '' })
      invalidateAll()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create payment request.'),
  })

  const verifyPaymentMutation = useMutation({
    mutationFn: ({ pid, status }: { pid: string; status: 'confirmed' | 'disputed' }) => adminVerifyPayment(pid, { status }),
    onSuccess: () => { toast.success('Payment updated.'); invalidateAll() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update payment.'),
  })

  const resolvePaymentMutation = useMutation({
    mutationFn: ({ pid, status }: { pid: string; status: 'confirmed' | 'cancelled' }) => adminResolvePayment(pid, { status }),
    onSuccess: () => { toast.success('Payment resolved.'); invalidateAll() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to resolve payment.'),
  })

  const detail = detailQuery.data
  const nextStatuses = detail ? STATUS_GRAPH[detail.status] ?? [] : []

  return (
    <PreviewDrawer
      open={!!applicationPid}
      onOpenChange={(open) => { if (!open) { onOpenChange(false); setShowDocForm(false); setShowPaymentForm(false) } }}
    >
      <PreviewDrawerContent>
        {detailQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading application…</div>
        ) : detail ? (
          <>
            <PreviewDrawerHeader title={detail.student_name} badge={renderApplicationStatus(detail.status)}>
              <p className="text-xs text-muted-foreground font-mono">{detail.reference_number}</p>
            </PreviewDrawerHeader>
            <PreviewDrawerBody>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Program</h4>
                <p className="text-sm font-semibold text-brand-navy">{detail.university_name}</p>
                <p className="text-xs text-muted-foreground">{detail.course_name} · {detail.intake_name} ({detail.intake_month}/{detail.intake_year})</p>
                {detail.tuition_fee_amount ? (
                  <p className="text-xs text-muted-foreground mt-1">Tuition: {detail.tuition_fee_currency} {detail.tuition_fee_amount}</p>
                ) : null}
                {detail.agent_name ? <p className="text-xs text-muted-foreground mt-1">Agent: {detail.agent_name}</p> : null}
              </div>

              {canWrite && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Move Application</h4>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.filter((s) => s !== 'withdrawn').map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant="secondary"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ publicId: detail.public_id, status })}
                      >
                        Move to {formatStatusLabel(status)}
                      </Button>
                    ))}
                    {nextStatuses.includes('withdrawn') && detail.status !== 'withdrawn' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600"
                        disabled={withdrawMutation.isPending}
                        onClick={() => {
                          const reason = window.prompt('Withdrawal reason')
                          if (reason === null) return
                          withdrawMutation.mutate({ publicId: detail.public_id, reason })
                        }}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Withdraw
                      </Button>
                    )}
                    {nextStatuses.length === 0 && <p className="text-xs text-muted-foreground">No further transitions available.</p>}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Requests</h4>
                  {canWrite && (
                    <Button size="sm" variant="ghost" onClick={() => setShowDocForm((v) => !v)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Request
                    </Button>
                  )}
                </div>
                {canWrite && showDocForm && (
                  <form
                    className="space-y-2 mb-3 p-3 rounded-md border border-border-warm bg-surface-warm"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!docForm.doc_label.trim()) { toast.error('Document label is required.'); return }
                      documentMutation.mutate({
                        publicId: detail.public_id,
                        payload: {
                          doc_label: docForm.doc_label.trim(),
                          description: docForm.description || undefined,
                          deadline: docForm.deadline || undefined,
                        },
                      })
                    }}
                  >
                    <input placeholder="Document label" className={inputClass} value={docForm.doc_label} onChange={(e) => setDocForm({ ...docForm, doc_label: e.target.value })} />
                    <textarea placeholder="Description (optional)" className={inputClass} rows={2} value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} />
                    <input type="date" className={inputClass} value={docForm.deadline} onChange={(e) => setDocForm({ ...docForm, deadline: e.target.value })} />
                    <Button size="sm" type="submit" disabled={documentMutation.isPending}>Create Request</Button>
                  </form>
                )}
                {(detail.document_requests ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No document requests yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.document_requests.map((doc: any) => (
                      <div key={doc.public_id} className="flex items-center justify-between p-2 rounded-md border border-border-warm">
                        <div>
                          <p className="text-sm font-medium text-brand-navy flex items-center gap-1"><FileUp className="h-3 w-3" />{doc.doc_label}</p>
                          <p className="text-[10px] text-muted-foreground">{formatStatusLabel(doc.status)}{doc.deadline ? ` · Due ${formatDate(doc.deadline)}` : ''}</p>
                        </div>
                        {canWrite && doc.status === 'submitted' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onClick={() => reviewDocMutation.mutate({ pid: doc.public_id, status: 'approved' })}>Approve</Button>
                            <Button size="sm" variant="secondary" className="text-red-600" onClick={() => {
                              const reason = window.prompt('Rejection reason')
                              if (!reason) return
                              reviewDocMutation.mutate({ pid: doc.public_id, status: 'rejected', reason })
                            }}>Reject</Button>
                          </div>
                        )}
                        {canWrite && doc.status === 'requested' && (
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => cancelDocMutation.mutate(doc.public_id)}>Cancel</Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payments</h4>
                  {canWrite && (
                    <Button size="sm" variant="ghost" onClick={() => setShowPaymentForm((v) => !v)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add
                    </Button>
                  )}
                </div>
                {canWrite && showPaymentForm && (
                  <form
                    className="space-y-2 mb-3 p-3 rounded-md border border-border-warm bg-surface-warm"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!paymentForm.label.trim()) { toast.error('Payment label is required.'); return }
                      paymentMutation.mutate({
                        publicId: detail.public_id,
                        payload: {
                          label: paymentForm.label.trim(),
                          amount: paymentForm.amount ? Number(paymentForm.amount) : undefined,
                          currency: paymentForm.currency,
                          payment_link: paymentForm.payment_link || undefined,
                          due_date: paymentForm.due_date || undefined,
                        },
                      })
                    }}
                  >
                    <input placeholder="Payment label (e.g. Tuition Deposit)" className={inputClass} value={paymentForm.label} onChange={(e) => setPaymentForm({ ...paymentForm, label: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min={0} step="0.01" placeholder="Amount" className={inputClass} value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                      <input placeholder="Currency" className={inputClass} value={paymentForm.currency} onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value.toUpperCase() })} />
                    </div>
                    <input placeholder="Payment link (optional)" className={inputClass} value={paymentForm.payment_link} onChange={(e) => setPaymentForm({ ...paymentForm, payment_link: e.target.value })} />
                    <input type="date" className={inputClass} value={paymentForm.due_date} onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })} />
                    <Button size="sm" type="submit" disabled={paymentMutation.isPending}>Create Payment Request</Button>
                  </form>
                )}
                {(detail.payments ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No payment records yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.payments.map((payment: any) => (
                      <div key={payment.public_id} className="flex items-center justify-between p-2 rounded-md border border-border-warm">
                        <div>
                          <p className="text-sm font-medium text-brand-navy flex items-center gap-1"><CreditCard className="h-3 w-3" />{payment.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {payment.amount ? `${payment.currency} ${payment.amount} · ` : ''}{formatStatusLabel(payment.status)}
                            {payment.due_date ? ` · Due ${formatDate(payment.due_date)}` : ''}
                          </p>
                        </div>
                        {canWrite && payment.status === 'student_marked_paid' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onClick={() => verifyPaymentMutation.mutate({ pid: payment.public_id, status: 'confirmed' })}>Confirm</Button>
                            <Button size="sm" variant="secondary" className="text-red-600" onClick={() => verifyPaymentMutation.mutate({ pid: payment.public_id, status: 'disputed' })}>Dispute</Button>
                          </div>
                        )}
                        {canWrite && payment.status === 'disputed' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onClick={() => resolvePaymentMutation.mutate({ pid: payment.public_id, status: 'confirmed' })}>Confirm</Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => resolvePaymentMutation.mutate({ pid: payment.public_id, status: 'cancelled' })}>Cancel</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Timeline</h4>
                {(detail.timeline ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.timeline.map((item: any, idx: number) => (
                      <div key={idx} className="text-xs border-l-2 border-brand-orange-accessible/40 pl-3 py-1">
                        <p className="text-brand-navy whitespace-pre-line">{item.content}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(item.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PreviewDrawerBody>
          </>
        ) : (
          <div className="p-6 text-sm text-red-600">Application could not be loaded.</div>
        )}
      </PreviewDrawerContent>
    </PreviewDrawer>
  )
}
