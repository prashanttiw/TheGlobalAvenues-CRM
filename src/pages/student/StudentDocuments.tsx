import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { FileUpload } from '../../shared/components/ui/FileUpload'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { FolderOpen, Upload, Calendar, FileCheck } from 'lucide-react'

interface DocumentRequest {
  id: string
  name: string
  requestedDate: string
  deadline: string
  status: StatusType
}

const MOCK_REQUESTS: DocumentRequest[] = [
  {
    id: 'req-1',
    name: 'IELTS Academic Test Scorecard',
    requestedDate: '2026-06-10',
    deadline: '2026-07-15',
    status: 'pending',
  },
  {
    id: 'req-2',
    name: 'Valid International Passport (Bio Page)',
    requestedDate: '2026-06-01',
    deadline: '2026-06-30',
    status: 'approved',
  }
]

export default function StudentDocuments() {
  const [requests, setRequests] = React.useState<DocumentRequest[]>(MOCK_REQUESTS)
  const [activeUploadId, setActiveUploadId] = React.useState<string | null>(null)

  const handleUploadSuccess = (id: string) => {
    setRequests(prev => prev.map(req => {
      if (req.id === id) {
        return { ...req, status: 'approved' }
      }
      return req
    }))
    setActiveUploadId(null)
  }

  const columns: ColumnDef<DocumentRequest>[] = [
    {
      key: 'name',
      header: 'Document Name',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.name}</p>
          <p className="text-xs text-muted-foreground">ID: {row.id}</p>
        </div>
      ),
    },
    {
      key: 'requestedDate',
      header: 'Requested On',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.requestedDate}</span>,
    },
    {
      key: 'deadline',
      header: 'Deadline',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {row.deadline}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'action',
      header: 'Action',
      cell: (row) => {
        if (row.status === 'pending') {
          return (
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setActiveUploadId(row.id === activeUploadId ? null : row.id)}
            >
              <Upload className="mr-1 h-3 w-3" />
              Upload
            </Button>
          )
        }
        return (
          <span className="flex items-center text-xs text-emerald-600 font-semibold">
            <FileCheck className="mr-1 h-4 w-4" />
            Verified
          </span>
        )
      },
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Documents Vault" 
        subtitle="Manage required checklists and upload your credentials."
      />

      <DataTable 
        columns={columns} 
        data={requests}
        emptyMessage="No documents requested yet."
      />

      {activeUploadId && (
        <Card className="border border-brand-orange-accessible/35 bg-brand-orange-accessible/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-brand-navy">
              Upload Document for: {requests.find(r => r.id === activeUploadId)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload 
              onFileSelect={() => handleUploadSuccess(activeUploadId)}
              className="max-w-md"
            />
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  )
}
