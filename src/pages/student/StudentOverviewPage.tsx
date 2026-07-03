import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  GraduationCap,
  Globe,
  Inbox,
  Lock,
  Mail,
  Phone,
  Sparkles,
  UserCheck,
} from 'lucide-react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { Badge, StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { StatCard } from '../../shared/components/ui/StatCard'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { ActivityFeedWidget } from '../../shared/components/ui/ActivityFeedWidget'
import { ProfileCompletionPanel } from '../../shared/components/student/ProfileCompletionPanel'
import { useAuth } from '../../shared/hooks/useAuth'
import { useUnreadCount } from '../../shared/hooks/useNotifications'
import {
  fetchReadiness,
  fetchStudentAgentInfo,
  fetchStudentApplicationsList,
  fetchStudentDocumentRequests,
  fetchStudentPayments,
  markPaymentPaid,
} from '../../lib/api'
import { isProfileReady } from '../../shared/constants/readiness'

const KNOWN_STATUSES = new Set<StatusType>([
  'registered', 'pending', 'approved', 'rejected', 'suspended', 'enrolled',
  'draft', 'submitted', 'under_review', 'offer_received', 'paid', 'confirmed',
])

const OPEN_STATUSES = new Set(['draft', 'submitted', 'documents_submitted', 'profile_review', 'inquiry'])
const IN_REVIEW_STATUSES = new Set(['under_review', 'conditional_offer', 'unconditional_offer', 'documents_submitted'])
const OFFER_STATUSES = new Set(['offer_received', 'conditional_offer', 'unconditional_offer', 'cas_coe_issued'])
const ENROLLED_STATUSES = new Set(['enrolled', 'departed', 'pre_departure', 'visa_approved', 'visa_applied'])

function renderStatus(status: string) {
  return KNOWN_STATUSES.has(status as StatusType) ? (
    <StatusBadge status={status as StatusType} />
  ) : (
    <Badge variant="secondary">{status.replace(/_/g, ' ')}</Badge>
  )
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

export default function StudentOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const readinessQuery = useQuery({
    queryKey: ['student', 'readiness'],
    queryFn: fetchReadiness,
  })

  const applicationsQuery = useQuery({
    queryKey: ['student', 'applications'],
    queryFn: fetchStudentApplicationsList,
  })

  const agentQuery = useQuery({
    queryKey: ['student', 'agent'],
    queryFn: fetchStudentAgentInfo,
  })

  const documentRequestsQuery = useQuery({
    queryKey: ['student', 'document-requests'],
    queryFn: fetchStudentDocumentRequests,
  })

  const paymentsQuery = useQuery({
    queryKey: ['student', 'payments'],
    queryFn: fetchStudentPayments,
  })

  const markPaidMutation = useMutation({
    mutationFn: markPaymentPaid,
    onSuccess: () => {
      toast.success('Marked as paid — awaiting confirmation.')
      queryClient.invalidateQueries({ queryKey: ['student', 'payments'] })
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed to mark payment as paid.'),
  })

  const unreadQuery = useUnreadCount()

  const applications = applicationsQuery.data ?? []
  const ready = isProfileReady(readinessQuery.data?.profile_status)
  const documentsNeeded = (documentRequestsQuery.data ?? []).filter((d: any) => d.status === 'requested')
  const paymentsDue = paymentsQuery.data ?? []

  const stats = React.useMemo(() => {
    let open = 0
    let inReview = 0
    let offers = 0
    let enrolled = 0
    for (const app of applications) {
      if (OPEN_STATUSES.has(app.status)) open += 1
      if (IN_REVIEW_STATUSES.has(app.status)) inReview += 1
      if (OFFER_STATUSES.has(app.status)) offers += 1
      if (ENROLLED_STATUSES.has(app.status)) enrolled += 1
    }
    return { total: applications.length, open, inReview, offers, enrolled }
  }, [applications])

  const recentApplications = applications.slice(0, 5)
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <PageWrapper className="space-y-6 sm:space-y-8">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Here's where your study-abroad journey stands right now."
      />

      {readinessQuery.isLoading ? null : ready ? (
        <div className="flex items-start gap-3 rounded-card border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Your profile is complete.</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Personal details and documents are on your{' '}
              <button type="button" className="font-semibold underline" onClick={() => navigate('/portal/student/profile')}>
                Profile page
              </button>. You can now apply to any program.
            </p>
          </div>
        </div>
      ) : (
        <ProfileCompletionPanel />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Applications" value={stats.total} icon={FileText} color="navy" isLoading={applicationsQuery.isLoading} />
        <StatCard label="Open / In Progress" value={stats.open} icon={Inbox} color="amber" isLoading={applicationsQuery.isLoading} />
        <StatCard label="In Review" value={stats.inReview} icon={Sparkles} color="orange" isLoading={applicationsQuery.isLoading} />
        <StatCard label="Offers Received" value={stats.offers} icon={CheckCircle2} color="green" isLoading={applicationsQuery.isLoading} />
        <StatCard label="Enrolled" value={stats.enrolled} icon={GraduationCap} color="green" isLoading={applicationsQuery.isLoading} />
        <StatCard label="Unread Notices" value={unreadQuery.data?.count ?? 0} icon={Mail} color="navy" isLoading={unreadQuery.isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border-warm pb-3">
            <CardTitle className="text-base font-semibold text-brand-navy">Recent Applications</CardTitle>
            <Button variant="secondary" size="sm" onClick={() => navigate('/portal/student/applications')}>
              View all
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {applicationsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading applications…</p>
            ) : recentApplications.length === 0 ? (
              <EmptyState
                icon={FileText}
                heading="No applications yet"
                description={ready ? 'Browse universities and submit your first application.' : 'Complete your profile above, then browse universities to apply.'}
                action={
                  <Button onClick={() => navigate('/portal/student/universities')}>
                    Browse Universities
                  </Button>
                }
              />
            ) : (
              recentApplications.map((app: any) => (
                <div
                  key={app.public_id}
                  className="flex items-center justify-between gap-4 rounded-card border border-border-warm bg-surface-card px-4 py-3 shadow-sm transition-colors hover:border-brand-orange-accessible/25 hover:bg-brand-orange-accessible/5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-navy truncate">{app.program_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{app.university_name} · {app.reference_number}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:inline">{formatDate(app.created_at)}</span>
                    {renderStatus(app.status)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <FileText className="h-4 w-4 text-brand-orange-accessible" />
              <CardTitle className="text-sm font-semibold text-brand-navy">Documents Needed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {documentRequestsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : documentsNeeded.length === 0 ? (
                <p className="text-xs text-muted-foreground">No outstanding document requests.</p>
              ) : (
                <>
                  {documentsNeeded.slice(0, 3).map((doc: any) => (
                    <div key={doc.public_id} className="flex items-center justify-between gap-3 rounded-card border border-border-warm px-3 py-2">
                      <p className="text-xs font-medium text-brand-navy truncate">{doc.doc_label}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0">{doc.deadline ? `Due ${formatDate(doc.deadline)}` : 'No deadline'}</span>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" className="w-full mt-1" onClick={() => navigate('/portal/student/documents')}>
                    {documentsNeeded.length > 3 ? `View all ${documentsNeeded.length}` : 'Go to Documents'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <CreditCard className="h-4 w-4 text-brand-orange-accessible" />
              <CardTitle className="text-sm font-semibold text-brand-navy">Payments Due</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {paymentsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : paymentsDue.length === 0 ? (
                <p className="text-xs text-muted-foreground">No payments due right now.</p>
              ) : (
                paymentsDue.slice(0, 3).map((payment: any) => (
                  <div key={payment.public_id} className="rounded-card border border-border-warm px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-brand-navy truncate">{payment.label}</p>
                      <span className="text-xs font-semibold text-brand-navy shrink-0">{payment.currency} {Number(payment.amount ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-muted-foreground">{payment.due_date ? `Due ${formatDate(payment.due_date)}` : 'No due date'}</span>
                      {payment.status === 'pending' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={markPaidMutation.isPending}
                          onClick={() => markPaidMutation.mutate(payment.public_id)}
                        >
                          Mark as Paid
                        </Button>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-700">
                          {payment.status === 'disputed' ? 'Disputed — contact us' : 'Awaiting confirmation'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 sm:p-6">
              {ready ? (
                <>
                  <div className="flex items-center gap-2 text-brand-navy">
                    <Globe className="h-4 w-4" />
                    <p className="text-sm font-semibold">Browse Universities</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Explore partner universities, programs, and open intakes.</p>
                  <Button className="w-full mt-4" onClick={() => navigate('/portal/student/universities')}>
                    Browse now
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-amber-700">
                    <Lock className="h-4 w-4" />
                    <p className="text-sm font-semibold">Applications locked</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    You can still browse universities and programs, but complete your profile above before applying.
                  </p>
                  <Button className="w-full mt-4" variant="secondary" onClick={() => navigate('/portal/student/universities')}>
                    Browse Universities
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <UserCheck className="h-4 w-4 text-brand-orange-accessible" />
              <CardTitle className="text-sm font-semibold text-brand-navy">Your Consultant</CardTitle>
            </CardHeader>
            <CardContent>
              {agentQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : agentQuery.data?.current_agent ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-brand-navy">{agentQuery.data.current_agent.full_name}</p>
                  {agentQuery.data.current_agent.agency_name && (
                    <p className="text-xs text-muted-foreground">{agentQuery.data.current_agent.agency_name}</p>
                  )}
                  {agentQuery.data.current_agent.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{agentQuery.data.current_agent.phone}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No consultant assigned yet.</p>
              )}
              <Button variant="secondary" size="sm" className="w-full mt-3" onClick={() => navigate('/portal/student/agent')}>
                Manage
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-brand-navy">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeedWidget rolePrefix="student" />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
