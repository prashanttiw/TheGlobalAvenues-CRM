import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Building2, Calendar, ExternalLink, GraduationCap, MapPin, Plus, Trash, Upload, User } from 'lucide-react'
import {
  createAdminUniversityCourse,
  createAdminUniversityLive,
  deleteAdminCourseLive,
  fetchAdminApplications,
  fetchAdminUniversityCourses,
  fetchAdminUniversityLive,
  updateAdminCourseFee,
  updateAdminCourseLive,
  updateAdminUniversityLive,
  uploadUniversityLogo,
} from '../../lib/api'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { Badge } from '../../shared/components/ui/Badge'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { EditableField } from '../../shared/components/ui/EditableField'
import { CountrySelect } from '../../shared/components/ui/CountrySelect'
import { UniversityLogo } from '../../shared/components/catalog/UniversityLogo'
import { ApplicationDetailDrawer, renderApplicationStatus } from '../../shared/components/applications/ApplicationDetailDrawer'
import { usePermission } from '../../hooks/usePermission'

const DEGREE_OPTIONS = [
  { value: 'certificate', label: 'Certificate' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'bachelors', label: "Bachelor's" },
  { value: 'masters', label: "Master's" },
  { value: 'phd', label: 'PhD' },
]

function formatFee(row: { min_tuition_fee?: any; max_tuition_fee?: any; tuition_fee_currency?: string | null }) {
  if (!row.min_tuition_fee) return 'Not set'
  const currency = row.tuition_fee_currency || ''
  if (row.min_tuition_fee === row.max_tuition_fee) return `${currency} ${row.min_tuition_fee}`
  return `${currency} ${row.min_tuition_fee} – ${row.max_tuition_fee}`
}

export default function AdminUniversityDetailPage() {
  const { pid } = useParams<{ pid: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canWrite = usePermission('universities', 'edit')
  const [isAddCourseOpen, setIsAddCourseOpen] = React.useState(false)
  const [courseForm, setCourseForm] = React.useState({ name: '', degree_level: 'bachelors', duration_months: 24, language: 'English' })
  const [selectedApplicationPid, setSelectedApplicationPid] = React.useState<string | null>(null)
  const [isAddCampusOpen, setIsAddCampusOpen] = React.useState(false)
  const [campusForm, setCampusForm] = React.useState({ city: '', country: '' })
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const universityQuery = useQuery({
    queryKey: ['admin', 'university-detail', pid],
    queryFn: () => fetchAdminUniversityLive(pid as string),
    enabled: !!pid,
  })

  const coursesQuery = useQuery({
    queryKey: ['admin', 'university-detail', pid, 'courses'],
    queryFn: () => fetchAdminUniversityCourses(pid as string),
    enabled: !!pid,
  })

  const applicationsQuery = useQuery({
    queryKey: ['admin', 'university-detail', pid, 'applications'],
    queryFn: () => fetchAdminApplications({ perPage: 100, universityPid: pid }),
    enabled: !!pid,
  })

  const invalidateUniversity = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'university-detail', pid] })
  const invalidateCourses = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'university-detail', pid, 'courses'] })

  const updateUniversityMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateAdminUniversityLive(pid as string, payload),
    onSuccess: invalidateUniversity,
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => uploadUniversityLogo(pid as string, file),
    onSuccess: () => { toast.success('Logo updated.'); invalidateUniversity() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to upload logo.'),
  })

  const createCourseMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAdminUniversityCourse(pid as string, payload),
    onSuccess: () => {
      toast.success('Course added.')
      setIsAddCourseOpen(false)
      setCourseForm({ name: '', degree_level: 'bachelors', duration_months: 24, language: 'English' })
      invalidateCourses()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create course.'),
  })

  const updateCourseMutation = useMutation({
    mutationFn: ({ coursePid, payload }: { coursePid: string; payload: Record<string, unknown> }) => updateAdminCourseLive(coursePid, payload),
    onSuccess: invalidateCourses,
  })

  const createCampusMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAdminUniversityLive(payload),
    onSuccess: () => {
      toast.success('Campus added — set up its own courses and fees on its detail page.')
      setIsAddCampusOpen(false)
      setCampusForm({ city: '', country: '' })
      invalidateUniversity()
      void queryClient.invalidateQueries({ queryKey: ['admin', 'universities'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to add campus.'),
  })

  const updateFeeMutation = useMutation({
    mutationFn: ({ coursePid, amount, currency }: { coursePid: string; amount: number; currency: string }) => updateAdminCourseFee(coursePid, amount, currency),
    onSuccess: invalidateCourses,
  })

  const deleteCourseMutation = useMutation({
    mutationFn: (coursePid: string) => deleteAdminCourseLive(coursePid),
    onSuccess: () => { toast.success('Course deleted.'); invalidateCourses() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to delete course.'),
  })

  const university = universityQuery.data
  const courses = coursesQuery.data ?? []
  const applications = applicationsQuery.data?.applications ?? []

  const courseColumns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Course Name',
      cell: (row) => (
        <EditableField
          value={row.name}
          onSave={(v) => updateCourseMutation.mutateAsync({ coursePid: row.public_id, payload: { name: v } })}
          disabled={!canWrite}
        />
      ),
    },
    {
      key: 'degree',
      header: 'Degree Level',
      cell: (row) => (
        <EditableField
          type="select"
          value={row.degree_level}
          options={DEGREE_OPTIONS}
          onSave={(v) => updateCourseMutation.mutateAsync({ coursePid: row.public_id, payload: { degree_level: v } })}
          disabled={!canWrite}
        />
      ),
    },
    {
      key: 'duration',
      header: 'Duration (months)',
      cell: (row) => (
        <EditableField
          value={String(row.duration_months ?? '')}
          onSave={(v) => updateCourseMutation.mutateAsync({ coursePid: row.public_id, payload: { duration_months: Number(v) || null } })}
          disabled={!canWrite}
        />
      ),
    },
    {
      key: 'fee',
      header: 'Fee Range',
      cell: (row) => (
        <EditableField
          value={row.min_tuition_fee ? String(row.min_tuition_fee) : ''}
          emptyLabel="Set fee"
          placeholder="e.g. 8400"
          onSave={async (v) => {
            const amount = Number(v)
            if (!v || Number.isNaN(amount) || amount < 0) {
              toast.error('Enter a valid fee amount.')
              throw new Error('Enter a valid fee amount.')
            }
            await updateFeeMutation.mutateAsync({ coursePid: row.public_id, amount, currency: row.tuition_fee_currency || 'EUR' })
          }}
          render={() => <span>{formatFee(row)}</span>}
          disabled={!canWrite}
        />
      ),
    },
    {
      key: 'intakes',
      header: 'Open Intakes',
      cell: (row) => (
        <button
          className="text-sm font-semibold text-brand-orange-accessible hover:underline"
          onClick={() => navigate('/portal/admin/intakes')}
        >
          {row.open_intake_count ?? 0}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <button
          disabled={!canWrite}
          onClick={() => updateCourseMutation.mutate({ coursePid: row.public_id, payload: { status: row.status === 'active' ? 'inactive' : 'active' } })}
          className="disabled:cursor-default"
        >
          <Badge variant={row.status === 'active' ? 'secondary' : 'outline'}>{row.status}</Badge>
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        canWrite ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600"
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`Delete ${row.name}?`)) deleteCourseMutation.mutate(row.public_id)
            }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        ) : null
      ),
    },
  ]

  const applicationColumns: ColumnDef<any>[] = [
    { key: 'reference', header: 'Reference', cell: (row) => <span className="font-mono text-xs font-semibold text-brand-navy">{row.reference_number}</span> },
    {
      key: 'student',
      header: 'Student',
      cell: (row) => <p className="font-semibold text-brand-navy flex items-center gap-1"><User className="h-3 w-3 text-muted-foreground" />{row.student_name}</p>,
    },
    { key: 'course', header: 'Course', cell: (row) => <span className="text-sm text-brand-navy">{row.course_name}</span> },
    { key: 'status', header: 'Status', cell: (row) => renderApplicationStatus(row.status) },
    {
      key: 'date',
      header: 'Date',
      cell: (row) => (
        <span className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {new Date(row.submitted_at || row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ]

  if (universityQuery.isLoading) {
    return (
      <PageWrapper className="space-y-6">
        <div className="text-sm text-muted-foreground">Loading university…</div>
      </PageWrapper>
    )
  }

  if (universityQuery.isError || !university) {
    return (
      <PageWrapper className="space-y-6">
        <EmptyState heading="University could not be loaded" action={<Button onClick={() => navigate('/portal/admin/universities')}>Back to Universities</Button>} />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="space-y-6">
      <button
        className="flex items-center gap-1 text-sm text-brand-navy font-medium hover:text-brand-orange-accessible"
        onClick={() => navigate('/portal/admin/universities')}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Universities
      </button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative group shrink-0">
              <UniversityLogo name={university.name} logoThumbUrl={university.logo_thumb_url} logoUrl={university.logo_url} size="xl" />
              {canWrite && (
                <button
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload logo"
                >
                  <Upload className="h-5 w-5 text-white" />
                </button>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-brand-navy font-display">
                  <EditableField
                    value={university.name}
                    onSave={(v) => updateUniversityMutation.mutateAsync({ name: v })}
                    className="text-xl font-bold"
                    disabled={!canWrite}
                  />
                </h1>
                <button
                  disabled={!canWrite}
                  className="disabled:cursor-default"
                  onClick={() => updateUniversityMutation.mutate({ status: university.status === 'active' ? 'inactive' : 'active' })}
                >
                  <Badge variant={university.status === 'active' ? 'secondary' : 'outline'}>{university.status}</Badge>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Country</p>
                  <EditableField type="country" value={university.country} onSave={(v) => updateUniversityMutation.mutateAsync({ country: v })} disabled={!canWrite} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">City</p>
                  <EditableField value={university.city ?? ''} onSave={(v) => updateUniversityMutation.mutateAsync({ city: v })} emptyLabel="Add city" disabled={!canWrite} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Website</p>
                  <EditableField
                    value={university.website_url ?? ''}
                    onSave={(v) => updateUniversityMutation.mutateAsync({ website_url: v })}
                    emptyLabel="Add website"
                    render={(v) => v ? <span className="flex items-center gap-1 text-brand-orange-accessible">{v}<ExternalLink className="h-3 w-3" /></span> : undefined}
                    disabled={!canWrite}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Partnership</p>
                  <EditableField
                    type="select"
                    value={university.partnership_type}
                    options={[{ value: 'non_exclusive', label: 'Non-exclusive' }, { value: 'exclusive', label: 'Exclusive' }]}
                    onSave={(v) => updateUniversityMutation.mutateAsync({ partnership_type: v })}
                    disabled={!canWrite}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                <EditableField
                  type="textarea"
                  value={university.description ?? ''}
                  onSave={(v) => updateUniversityMutation.mutateAsync({ description: v })}
                  emptyLabel="Add a description"
                  placeholder="Describe this university…"
                  disabled={!canWrite}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Facts / Ranking Info</p>
                <EditableField
                  type="textarea"
                  value={university.ranking_info ?? ''}
                  onSave={(v) => updateUniversityMutation.mutateAsync({ ranking_info: v })}
                  emptyLabel="Add fast facts (shown to students and agents)"
                  placeholder="e.g. Ranked #1 for Business in Austria…"
                  disabled={!canWrite}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-brand-orange-accessible" />Other Campuses</CardTitle>
          {canWrite && <Button size="sm" onClick={() => setIsAddCampusOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Campus</Button>}
        </CardHeader>
        <CardContent>
          {university.siblings && university.siblings.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {university.siblings.map((sibling: any) => (
                <button
                  key={sibling.public_id}
                  onClick={() => navigate(`/portal/admin/universities/${sibling.public_id}`)}
                  className="flex items-center gap-2 rounded-md border border-border-warm bg-surface-warm px-3 py-2 text-left text-sm hover:border-brand-orange-accessible/50 hover:bg-surface-card transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-brand-orange-accessible shrink-0" />
                  <span className="font-medium text-brand-navy">{sibling.city || 'Unknown city'}</span>
                  <span className="text-muted-foreground">, {sibling.country}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No other campuses linked yet. Each campus is managed independently — its own courses, fees, intakes, and applications.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-brand-orange-accessible" />Courses</CardTitle>
          {canWrite && <Button size="sm" onClick={() => setIsAddCourseOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Course</Button>}
        </CardHeader>
        <CardContent>
          {canWrite && <p className="text-xs text-muted-foreground mb-3">Double-click a cell to edit it in place.</p>}
          <DataTable
            columns={courseColumns}
            data={courses}
            isLoading={coursesQuery.isLoading}
            emptyMessage="No courses yet — add the first one."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students & Applications ({applications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={applicationColumns}
            data={applications}
            isLoading={applicationsQuery.isLoading}
            onRowClick={(row: any) => setSelectedApplicationPid(row.public_id)}
            emptyMessage="No students have applied to this university yet."
          />
        </CardContent>
      </Card>

      <SlideOverPanel title="Add New Course" open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createCourseMutation.mutate(courseForm)
          }}
          className="space-y-6"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Course Name</label>
              <input
                type="text"
                required
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Degree Level</label>
                <select
                  value={courseForm.degree_level}
                  onChange={(e) => setCourseForm({ ...courseForm, degree_level: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                >
                  {DEGREE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Duration (months)</label>
                <input
                  type="number"
                  min={1}
                  value={courseForm.duration_months}
                  onChange={(e) => setCourseForm({ ...courseForm, duration_months: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddCourseOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={createCourseMutation.isPending}>Save Course</Button>
          </div>
        </form>
      </SlideOverPanel>

      <SlideOverPanel title="Add Another Campus" open={isAddCampusOpen} onOpenChange={setIsAddCampusOpen}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createCampusMutation.mutate({
              name: university.name,
              partnership_type: university.partnership_type,
              parent_public_id: pid,
              city: campusForm.city,
              country: campusForm.country,
            })
          }}
          className="space-y-6"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adds another location for <strong>{university.name}</strong> as its own fully independent entry — its own courses, fees, intakes, and students. Just tell us where.
            </p>
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">City</label>
              <input
                type="text"
                required
                value={campusForm.city}
                onChange={(e) => setCampusForm({ ...campusForm, city: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Country</label>
              <CountrySelect value={campusForm.country} onChange={(country) => setCampusForm({ ...campusForm, country })} />
            </div>
          </div>
          <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddCampusOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={createCampusMutation.isPending || !campusForm.city || !campusForm.country}>Add Campus</Button>
          </div>
        </form>
      </SlideOverPanel>

      <ApplicationDetailDrawer
        applicationPid={selectedApplicationPid}
        onOpenChange={(open) => !open && setSelectedApplicationPid(null)}
        onMutated={() => void queryClient.invalidateQueries({ queryKey: ['admin', 'university-detail', pid, 'applications'] })}
      />

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png, image/jpeg"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) uploadLogoMutation.mutate(file)
          e.target.value = ''
        }}
      />
    </PageWrapper>
  )
}
