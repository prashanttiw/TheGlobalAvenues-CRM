import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  FileText,
  GraduationCap,
  ListChecks,
  Mail,
  Phone,
  User,
} from 'lucide-react'
import { fetchAdminStudentDetail, openAgentDocument } from '../../lib/api'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Badge, StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { toast } from 'sonner'

const KNOWN_STATUSES = new Set<StatusType>([
  'registered', 'pending', 'approved', 'rejected', 'suspended', 'enrolled',
  'draft', 'submitted', 'under_review', 'offer_received', 'paid', 'confirmed',
])

function renderStatus(status: string) {
  return KNOWN_STATUSES.has(status as StatusType) ? (
    <StatusBadge status={status as StatusType} />
  ) : (
    <Badge variant="secondary">{status.replace(/_/g, ' ')}</Badge>
  )
}

function formatDate(value?: string | null) {
  if (!value) return null
  return new Date(value).toLocaleDateString()
}

function Field({ label, value, full }: { label: string; value?: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : undefined}>
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
      {value ? (
        <p className="text-sm text-brand-navy mt-0.5">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic mt-0.5">Not provided yet</p>
      )}
    </div>
  )
}

async function openDoc(filePid: string) {
  try {
    await openAgentDocument(filePid)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not open document.')
  }
}

const REQUIRED_DOC_LABELS: Record<string, string> = {
  photo: 'Photo',
  passport_front: 'Passport (Front)',
  passport_back: 'Passport (Back)',
  academic_marksheet: 'Academic Marksheet',
  transcript: 'Academic Transcript',
  phd_thesis: 'PhD Thesis',
  phd_lor_professional: 'Professional LOR',
}

export default function AdminStudentDetailPage() {
  const { pid } = useParams<{ pid: string }>()
  const navigate = useNavigate()

  const detailQuery = useQuery({
    queryKey: ['admin', 'student-detail', pid],
    queryFn: () => fetchAdminStudentDetail(pid as string),
    enabled: !!pid,
  })

  if (detailQuery.isLoading) {
    return (
      <PageWrapper className="space-y-6">
        <div className="text-sm text-muted-foreground">Loading student…</div>
      </PageWrapper>
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageWrapper className="space-y-6">
        <EmptyState
          heading="Student could not be loaded"
          description={detailQuery.error instanceof Error ? detailQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => navigate('/portal/admin/students')}>Back to Students</Button>}
        />
      </PageWrapper>
    )
  }

  const { student, academics, test_scores: testScores, applications, readiness, custom_fields: customFields } = detailQuery.data

  const requiredCategories: string[] = readiness.planning_phd
    ? [...readiness.required_categories, ...readiness.phd_required_categories]
    : readiness.required_categories
  const documentsByCategory = new Map<string, any>((readiness.documents ?? []).map((d: any) => [d.category, d]))

  const applicationColumns: ColumnDef<any>[] = [
    { key: 'reference', header: 'Reference', cell: (row) => <span className="font-semibold text-brand-navy">{row.reference_number}</span> },
    { key: 'program', header: 'Program', cell: (row) => <span>{row.course_name} · {row.university_name}</span> },
    { key: 'status', header: 'Status', cell: (row) => renderStatus(row.status) },
    { key: 'created', header: 'Started', cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.created_at) ?? '—'}</span> },
  ]

  return (
    <PageWrapper className="space-y-6">
      <button
        className="flex items-center gap-1 text-sm text-brand-navy font-medium hover:text-brand-orange-accessible"
        onClick={() => navigate('/portal/admin/students')}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Students
      </button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-brand-navy/10 flex items-center justify-center text-lg font-bold text-brand-navy shrink-0">
                {student.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-brand-navy font-display">{student.full_name}</h1>
                  {renderStatus(student.profile_status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">ID: {student.public_id}</p>
              </div>
            </div>
            <div className="text-sm text-right">
              <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Agent</p>
              <p className="text-brand-navy font-medium">
                {student.agent ? (student.agent.agency_name || student.agent.full_name) : 'None (Direct)'}
              </p>
              {student.agent_lock_status === 'locked' && (
                <p className="text-[10px] text-muted-foreground mt-0.5">Assignment locked</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Identity &amp; Contact</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" value={student.email ? <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{student.email}</span> : undefined} />
          <Field label="Phone" value={student.phone_in_profile || student.phone ? <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{student.phone_in_profile || student.phone}</span> : undefined} />
          <Field label="Alternate Mobile" value={student.alternate_mobile} />
          <Field label="Date of Birth" value={formatDate(student.date_of_birth)} />
          <Field label="Gender" value={student.gender} />
          <Field label="Nationality" value={student.nationality} />
          <Field label="Passport Number" value={student.passport_number} />
          <Field label="Passport Expiry" value={formatDate(student.passport_expiry)} />
          <Field label="Lead Source" value={student.lead_source} />
          <Field label="How They Heard About Us" value={student.how_heard_about_us} />
          <Field label="Planning PhD?" value={student.planning_phd ? 'Yes' : 'No'} />
          <Field label="Registered" value={formatDate(student.created_at)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Academic Profile</CardTitle></CardHeader>
        <CardContent>
          {academics.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Not provided yet.</p>
          ) : (
            <div className="space-y-3">
              {academics.map((row: any) => (
                <div key={row.public_id} className="p-3 rounded-lg border border-border-warm bg-surface-warm/40">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="font-semibold text-brand-navy text-sm">{row.institution_name}</p>
                    {row.is_highest_qualification ? <Badge variant="secondary">Highest Qualification</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {row.degree_level}{row.field_of_study ? ` · ${row.field_of_study}` : ''}
                    {row.score_type ? ` · ${row.score_type}: ${row.score_value}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(row.start_date) ?? '—'} – {formatDate(row.end_date) ?? '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Test Scores</CardTitle></CardHeader>
        <CardContent>
          {testScores.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Not provided yet.</p>
          ) : (
            <div className="space-y-3">
              {testScores.map((row: any) => (
                <div key={row.public_id} className="p-3 rounded-lg border border-border-warm bg-surface-warm/40">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="font-semibold text-brand-navy text-sm">{row.test_name}</p>
                    <span className="text-sm font-bold text-brand-orange-accessible">{row.overall_score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {[
                      row.reading_score && `Reading ${row.reading_score}`,
                      row.writing_score && `Writing ${row.writing_score}`,
                      row.listening_score && `Listening ${row.listening_score}`,
                      row.speaking_score && `Speaking ${row.speaking_score}`,
                    ].filter(Boolean).join(' · ') || 'No section breakdown'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(row.test_date) ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documents / Readiness</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {requiredCategories.map((category) => {
              const doc = documentsByCategory.get(category)
              return (
                <div key={category} className="flex items-center justify-between p-2.5 rounded-lg border border-border-warm bg-surface-warm/40">
                  <span className="text-sm text-brand-navy">{REQUIRED_DOC_LABELS[category] ?? category}</span>
                  {doc ? (
                    <Button size="sm" variant="secondary" onClick={() => openDoc(doc.file_public_id)}>View</Button>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Not provided yet</span>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Applications ({applications.count})</CardTitle></CardHeader>
        <CardContent>
          {applications.count === 0 ? (
            <p className="text-sm text-muted-foreground italic">No applications started yet.</p>
          ) : (
            <DataTable columns={applicationColumns} data={applications.items} emptyMessage="No applications yet." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No custom fields have been configured yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customFields.map((field: any) => (
                <Field
                  key={field.definition_public_id}
                  label={field.label + (field.is_required ? ' *' : '')}
                  value={
                    field.field_type === 'file' && field.file ? (
                      <Button size="sm" variant="secondary" onClick={() => openDoc(field.file.public_id)}>
                        {field.file.display_filename}
                      </Button>
                    ) : (
                      field.value_text
                    )
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" /> Last updated {formatDate(student.updated_at) ?? '—'}
      </p>
    </PageWrapper>
  )
}
