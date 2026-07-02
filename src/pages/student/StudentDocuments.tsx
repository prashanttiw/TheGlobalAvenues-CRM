import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStudentDocumentRequests, submitStudentDocumentRequest } from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Badge, StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { FileUpload } from '../../shared/components/ui/FileUpload'
import { Calendar, FileCheck, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface DocumentRequest {
  public_id: string
  doc_label: string
  created_at?: string
  deadline?: string | null
  status: string
  file_name?: string | null
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

export default function StudentDocuments() {
  const queryClient = useQueryClient()
  const [activeUploadId, setActiveUploadId] = React.useState<string | null>(null)

  const requestsQuery = useQuery({
    queryKey: ['student', 'document-requests'],
    queryFn: fetchStudentDocumentRequests,
    staleTime: 30_000,
  })

  const submitMutation = useMutation({
    mutationFn: ({ requestPid, file }: { requestPid: string; file: File }) => submitStudentDocumentRequest(requestPid, file),
    onSuccess: () => {
      toast.success('Document submitted successfully.')
      setActiveUploadId(null)
      void queryClient.invalidateQueries({ queryKey: ['student', 'document-requests'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to submit document.')
    },
  })

  const requests = (requestsQuery.data ?? []) as DocumentRequest[]

  const columns: ColumnDef<DocumentRequest>[] = [
    {
      key: 'name',
      header: 'Document Name',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.doc_label}</p>
          <p className="text-xs text-muted-foreground">ID: {row.public_id}</p>
        </div>
      ),
    },
    {
      key: 'requestedDate',
      header: 'Requested On',
      cell: (row) => <span className="text-xs text-muted-foreground">{new Date(row.created_at || Date.now()).toLocaleDateString()}</span>,
    },
    {
      key: 'deadline',
      header: 'Deadline',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {row.deadline ? new Date(row.deadline).toLocaleDateString() : 'No deadline'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => renderStatus(row.status),
    },
    {
      key: 'action',
      header: 'Action',
      cell: (row) => {
        if (row.status === 'requested' || row.status === 'rejected') {
          return (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveUploadId(row.public_id === activeUploadId ? null : row.public_id)}
            >
              <Upload className="mr-1 h-3 w-3" />
              {row.status === 'rejected' ? 'Re-upload' : 'Upload'}
            </Button>
          )
        }
        return (
          <span className="flex items-center text-xs text-emerald-600 font-semibold">
            <FileCheck className="mr-1 h-4 w-4" />
            {row.status === 'submitted' ? 'Submitted' : 'Verified'}
          </span>
        )
      },
    },
  ]

  return (
    <PageWrapper className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Documents Vault"
        subtitle="Manage real document requests and upload required files."
      />

      {requestsQuery.isError ? (
        <EmptyState
          icon={Upload}
          heading="Document requests could not be loaded"
          description={requestsQuery.error instanceof Error ? requestsQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => requestsQuery.refetch()}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={requests}
          isLoading={requestsQuery.isLoading}
          emptyMessage="No documents requested yet."
        />
      )}

      {activeUploadId && (
        <Card className="border-brand-orange-accessible/35 bg-brand-orange-accessible/5 shadow-warm-md">
          <CardHeader className="border-b border-brand-orange-accessible/20 pb-3">
            <CardTitle className="text-sm font-semibold text-brand-navy">
              Upload Document for: {requests.find((r) => r.public_id === activeUploadId)?.doc_label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFileSelect={(file) => submitMutation.mutate({ requestPid: activeUploadId, file })}
              className="max-w-xl"
            />
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  )
}
