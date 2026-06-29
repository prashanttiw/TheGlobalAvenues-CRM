import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, CreditCard, Edit, FileUp, Globe, User } from 'lucide-react'
import {
  createAdminApplicationDocumentRequest,
  createAdminApplicationPaymentRequest,
  fetchAdminApplications,
  updateAdminApplicationStatus,
} from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Badge, StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { toast } from 'sonner'

interface AdminApplicationRecord {
  public_id: string
  reference_number: string
  student_name: string
  student_pid: string
  university_name: string
  course_name: string
  status: string
  submitted_at?: string | null
  created_at: string
  intake_year: number
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

function formatDate(value?: string | null) {
  return new Date(value || Date.now()).toLocaleDateString()
}

export default function AdminApplicationsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = React.useState('')
  const [univFilter, setUnivFilter] = React.useState('')
  const [yearFilter, setYearFilter] = React.useState('')

  const applicationsQuery = useQuery({
    queryKey: ['admin', 'applications'],
    queryFn: () => fetchAdminApplications({ perPage: 100 }),
    staleTime: 30_000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ publicId, status }: { publicId: string; status: string }) =>
      updateAdminApplicationStatus(publicId, status),
    onSuccess: () => {
      toast.success('Application status updated.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update application status.')
    },
  })

  const documentMutation = useMutation({
    mutationFn: ({ publicId, payload }: { publicId: string; payload: { doc_label: string; description?: string; deadline?: string } }) =>
      createAdminApplicationDocumentRequest(publicId, payload),
    onSuccess: () => {
      toast.success('Document request created.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create document request.')
    },
  })

  const paymentMutation = useMutation({
    mutationFn: ({
      publicId,
      payload,
    }: {
      publicId: string
      payload: { label: string; amount?: number; currency?: string; payment_link?: string; due_date?: string }
    }) => createAdminApplicationPaymentRequest(publicId, payload),
    onSuccess: () => {
      toast.success('Payment request created.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create payment request.')
    },
  })

  const allApplications = (applicationsQuery.data?.applications ?? []) as AdminApplicationRecord[]
  const applications = allApplications.filter((app) => {
    const matchesStatus = !statusFilter || app.status === statusFilter
    const matchesUniversity = !univFilter || app.university_name === univFilter
    const matchesYear = !yearFilter || String(app.intake_year) === yearFilter
    return matchesStatus && matchesUniversity && matchesYear
  })
  const universityOptions = Array.from(new Set(allApplications.map((app) => app.university_name).filter(Boolean))).sort()
  const yearOptions = Array.from(new Set(allApplications.map((app) => app.intake_year).filter(Boolean))).sort((a, b) => a - b)

  const columns: ColumnDef<AdminApplicationRecord>[] = [
    {
      key: 'reference',
      header: 'Reference',
      cell: (row) => <span className="font-mono text-xs font-semibold text-brand-navy">{row.reference_number}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            {row.student_name}
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
            {row.university_name}
          </p>
          <p className="text-[10px] text-muted-foreground">{row.course_name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => renderStatus(row.status),
    },
    {
      key: 'date',
      header: 'Submission Date',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {formatDate(row.submitted_at || row.created_at)}
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
              {
                label: 'Change Status',
                icon: Edit,
                onClick: () => {
                  const nextStatus = window.prompt('Enter new application status', row.status)
                  if (!nextStatus || nextStatus === row.status) {
                    return
                  }
                  statusMutation.mutate({ publicId: row.public_id, status: nextStatus.trim() })
                },
              },
              {
                label: 'Request Document',
                icon: FileUp,
                onClick: () => {
                  const docLabel = window.prompt('Document label')
                  if (!docLabel?.trim()) {
                    return
                  }
                  const description = window.prompt('Description (optional)') || undefined
                  const deadline = window.prompt('Deadline in YYYY-MM-DD format (optional)') || undefined
                  documentMutation.mutate({
                    publicId: row.public_id,
                    payload: { doc_label: docLabel.trim(), description, deadline },
                  })
                },
              },
              {
                label: 'Add Payment Record',
                icon: CreditCard,
                onClick: () => {
                  const label = window.prompt('Payment label')
                  if (!label?.trim()) {
                    return
                  }
                  const amountRaw = window.prompt('Amount (optional)')
                  const dueDate = window.prompt('Due date in YYYY-MM-DD format (optional)') || undefined
                  paymentMutation.mutate({
                    publicId: row.public_id,
                    payload: {
                      label: label.trim(),
                      amount: amountRaw ? Number(amountRaw) : undefined,
                      due_date: dueDate,
                    },
                  })
                },
              },
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
        subtitle="Manage real academic applications across the live portal pipeline."
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
        <div className="flex gap-2 flex-wrap w-full">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="offer_received">Offer Received</option>
            <option value="enrolled">Enrolled</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={univFilter}
            onChange={(e) => setUnivFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="">All Universities</option>
            {universityOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full sm:w-36 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="">All Years</option>
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {applicationsQuery.isError ? (
        <EmptyState
          icon={Globe}
          heading="Applications could not be loaded"
          description={applicationsQuery.error instanceof Error ? applicationsQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => applicationsQuery.refetch()}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={applications}
          isLoading={applicationsQuery.isLoading}
          emptyMessage="No applications match the current filters."
        />
      )}
    </PageWrapper>
  )
}
