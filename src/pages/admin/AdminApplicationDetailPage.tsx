import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CreditCard, FileUp, Plus, XCircle } from 'lucide-react'
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
} from '../../lib/api'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { formatStatusLabel, renderApplicationStatus } from '../../shared/components/applications/applicationStatusBadge'
import { usePermission } from '../../hooks/usePermission'

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

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString()
}

const inputClass =
  'w-full px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none'

export default function AdminApplicationDetailPage() {
  const { pid } = useParams<{ pid: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canWrite = usePermission('applications', 'edit')
  const [showDocForm, setShowDocForm] = React.useState(false)
  const [showPaymentForm, setShowPaymentForm] = React.useState(false)
  const [docForm, setDocForm] = React.useState({ doc_label: '', description: '', deadline: '' })
  const [paymentForm, setPaymentForm] = React.useState({ label: '', amount: '', currency: 'EUR', payment_link: '', due_date: '' })

  const detailQuery = useQuery({
    queryKey: ['admin', 'applications', pid],
    queryFn: () => fetchAdminApplicationByPublicId(pid as string),
    enabled: !!pid,
  })

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] })
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
    mutationFn: ({ pid: docPid, status, reason }: { pid: string; status: 'approved' | 'rejected'; reason?: string }) =>
      adminReviewDocumentRequest(docPid, { status, rejection_reason: reason }),
    onSuccess: () => { toast.success('Document request reviewed.'); invalidateAll() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to review document request.'),
  })

  const cancelDocMutation = useMutation({
    mutationFn: (docPid: string) => adminCancelDocumentRequest(docPid),
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
    mutationFn: ({ pid: paymentPid, status }: { pid: string; status: 'confirmed' | 'disputed' }) => adminVerifyPayment(paymentPid, { status }),
    onSuccess: () => { toast.success('Payment updated.'); invalidateAll() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update payment.'),
  })

  const resolvePaymentMutation = useMutation({
    mutationFn: ({ pid: paymentPid, status }: { pid: string; status: 'confirmed' | 'cancelled' }) => adminResolvePayment(paymentPid, { status }),
    onSuccess: () => { toast.success('Payment resolved.'); invalidateAll() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to resolve payment.'),
  })

  const detail = detailQuery.data
  const nextStatuses = detail ? STATUS_GRAPH[detail.status] ?? [] : []

  if (detailQuery.isLoading) {
    return (
      <PageWrapper className="space-y-6">
        <div className="text-sm text-muted-foreground">Loading application…</div>
      </PageWrapper>
    )
  }

  if (detailQuery.isError || !detail) {
    return (
      <PageWrapper className="space-y-6">
        <EmptyState heading="Application could not be loaded" action={<Button onClick={() => navigate('/portal/admin/applications')}>Back to Applications</Button>} />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="space-y-6">
      <button
        className="flex items-center gap-1 text-sm text-brand-navy font-medium hover:text-brand-orange-accessible"
        onClick={() => navigate('/portal/admin/applications')}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Applications
      </button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-brand-navy font-display">{detail.student_name}</h1>
              <p className="text-xs text-muted-foreground font-mono mt-1">{detail.reference_number}</p>
            </div>
            {renderApplicationStatus(detail.status)}
          </div>
          <div className="mt-4 pt-4 border-t border-border-warm grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-brand-navy">{detail.university_name}</p>
              <p className="text-xs text-muted-foreground">{detail.course_name} · {detail.intake_name} ({detail.intake_month}/{detail.intake_year})</p>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {detail.tuition_fee_amount ? <p>Tuition: {detail.tuition_fee_currency} {detail.tuition_fee_amount}</p> : null}
              {detail.agent_name ? <p>Agent: {detail.agent_name}</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {canWrite && (
            <Card>
              <CardHeader>
                <CardTitle>Move Application</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Document Requests</CardTitle>
              {canWrite && (
                <Button size="sm" variant="ghost" onClick={() => setShowDocForm((v) => !v)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Request
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {canWrite && showDocForm && (
                <form
                  className="grid gap-3 mb-4 p-4 rounded-md border border-border-warm bg-surface-warm sm:grid-cols-2"
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
                  <input type="date" className={inputClass} value={docForm.deadline} onChange={(e) => setDocForm({ ...docForm, deadline: e.target.value })} />
                  <textarea placeholder="Description (optional)" className={`${inputClass} sm:col-span-2`} rows={2} value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} />
                  <Button size="sm" type="submit" disabled={documentMutation.isPending} className="sm:col-span-2 sm:justify-self-start">Create Request</Button>
                </form>
              )}
              {(detail.document_requests ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No document requests yet.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {detail.document_requests.map((doc: any) => (
                    <div key={doc.public_id} className="flex items-center justify-between p-3 rounded-md border border-border-warm">
                      <div>
                        <p className="text-sm font-medium text-brand-navy flex items-center gap-1"><FileUp className="h-3 w-3" />{doc.doc_label}</p>
                        <p className="text-[10px] text-muted-foreground">{formatStatusLabel(doc.status)}{doc.deadline ? ` · Due ${formatDate(doc.deadline)}` : ''}</p>
                      </div>
                      {canWrite && doc.status === 'submitted' && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="secondary" onClick={() => reviewDocMutation.mutate({ pid: doc.public_id, status: 'approved' })}>Approve</Button>
                          <Button size="sm" variant="secondary" className="text-red-600" onClick={() => {
                            const reason = window.prompt('Rejection reason')
                            if (!reason) return
                            reviewDocMutation.mutate({ pid: doc.public_id, status: 'rejected', reason })
                          }}>Reject</Button>
                        </div>
                      )}
                      {canWrite && doc.status === 'requested' && (
                        <Button size="sm" variant="ghost" className="text-red-600 shrink-0" onClick={() => cancelDocMutation.mutate(doc.public_id)}>Cancel</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Payments</CardTitle>
              {canWrite && (
                <Button size="sm" variant="ghost" onClick={() => setShowPaymentForm((v) => !v)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {canWrite && showPaymentForm && (
                <form
                  className="grid gap-3 mb-4 p-4 rounded-md border border-border-warm bg-surface-warm sm:grid-cols-2"
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
                  <input placeholder="Payment label (e.g. Tuition Deposit)" className={`${inputClass} sm:col-span-2`} value={paymentForm.label} onChange={(e) => setPaymentForm({ ...paymentForm, label: e.target.value })} />
                  <input type="number" min={0} step="0.01" placeholder="Amount" className={inputClass} value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                  <input placeholder="Currency" className={inputClass} value={paymentForm.currency} onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value.toUpperCase() })} />
                  <input placeholder="Payment link (optional)" className={inputClass} value={paymentForm.payment_link} onChange={(e) => setPaymentForm({ ...paymentForm, payment_link: e.target.value })} />
                  <input type="date" className={inputClass} value={paymentForm.due_date} onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })} />
                  <Button size="sm" type="submit" disabled={paymentMutation.isPending} className="sm:col-span-2 sm:justify-self-start">Create Payment Request</Button>
                </form>
              )}
              {(detail.payments ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No payment records yet.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {detail.payments.map((payment: any) => (
                    <div key={payment.public_id} className="flex items-center justify-between p-3 rounded-md border border-border-warm">
                      <div>
                        <p className="text-sm font-medium text-brand-navy flex items-center gap-1"><CreditCard className="h-3 w-3" />{payment.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {payment.amount ? `${payment.currency} ${payment.amount} · ` : ''}{formatStatusLabel(payment.status)}
                          {payment.due_date ? ` · Due ${formatDate(payment.due_date)}` : ''}
                        </p>
                      </div>
                      {canWrite && payment.status === 'student_marked_paid' && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="secondary" onClick={() => verifyPaymentMutation.mutate({ pid: payment.public_id, status: 'confirmed' })}>Confirm</Button>
                          <Button size="sm" variant="secondary" className="text-red-600" onClick={() => verifyPaymentMutation.mutate({ pid: payment.public_id, status: 'disputed' })}>Dispute</Button>
                        </div>
                      )}
                      {canWrite && payment.status === 'disputed' && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="secondary" onClick={() => resolvePaymentMutation.mutate({ pid: payment.public_id, status: 'confirmed' })}>Confirm</Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => resolvePaymentMutation.mutate({ pid: payment.public_id, status: 'cancelled' })}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {(detail.timeline ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {detail.timeline.map((item: any, idx: number) => (
                    <div key={idx} className="text-xs border-l-2 border-brand-orange-accessible/40 pl-3 py-1">
                      <p className="text-brand-navy whitespace-pre-line">{item.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(item.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
