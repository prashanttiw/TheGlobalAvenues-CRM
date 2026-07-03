import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, Calendar, Copy, Pencil, Plus, Trash } from 'lucide-react'
import {
  cloneAdminIntake,
  createAdminCourseIntake,
  deleteAdminIntakeLive,
  fetchAdminIntakesAll,
  fetchAdminUniversitiesLive,
  fetchAdminUniversityCourses,
  updateAdminIntakeLive,
  updateAdminIntakeStatus,
} from '../../lib/api'
import { usePermission } from '../../hooks/usePermission'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { Pagination } from '../../shared/components/ui/Pagination'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { EditableField } from '../../shared/components/ui/EditableField'
import { UniversityLogo } from '../../shared/components/catalog/UniversityLogo'
import { Modal, ModalAction, ModalCancel, ModalContent, ModalFooter, ModalHeader, ModalTitle } from '../../shared/components/ui/Modal'
import { toast } from 'sonner'

const PER_PAGE = 20

interface UniversityRow {
  public_id: string
  name: string
  logo_thumb_url?: string | null
}

interface CourseRow {
  public_id: string
  name: string
  university_public_id: string
  university_name: string
  university_logo_thumb_url?: string | null
}

interface IntakeRow {
  public_id: string
  name: string
  intake_month: number | null
  intake_year: number | null
  application_open_date: string | null
  application_deadline: string | null
  course_start_date: string | null
  tuition_fee_amount: number | null
  tuition_fee_currency: string | null
  requirements_notes: string | null
  status: string
  application_count: number
  course_public_id: string
  course_name: string
  university_public_id: string
  university_name: string
  university_logo_thumb_url?: string | null
}

interface IntakeFormState {
  universityPublicId: string
  coursePublicId: string
  name: string
  intakeMonth: string
  intakeYear: string
  applicationDeadline: string
  courseStartDate: string
  tuitionFeeAmount: string
  tuitionFeeCurrency: string
  requirementsNotes: string
  status: string
}

const INITIAL_FORM: IntakeFormState = {
  universityPublicId: '',
  coursePublicId: '',
  name: 'Fall Intake',
  intakeMonth: '9',
  intakeYear: String(new Date().getFullYear()),
  applicationDeadline: '',
  courseStartDate: '',
  tuitionFeeAmount: '',
  tuitionFeeCurrency: 'EUR',
  requirementsNotes: '',
  status: 'upcoming',
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString()
}

function toDateInputValue(value: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

function renderStatus(status: string) {
  const variant = status === 'open' ? 'secondary' : status === 'closed' ? 'outline' : 'default'
  return <Badge variant={variant}>{status.replace(/_/g, ' ')}</Badge>
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  upcoming: ['open', 'closed'],
  open: ['closed'],
  closed: [],
}

function validNextStatuses(status: string): string[] {
  return VALID_STATUS_TRANSITIONS[status] ?? []
}

export default function AdminIntakesPage() {
  const queryClient = useQueryClient()
  const [universityFilter, setUniversityFilter] = React.useState('')
  const [courseFilter, setCourseFilter] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [form, setForm] = React.useState<IntakeFormState>(INITIAL_FORM)
  const [cloningIntake, setCloningIntake] = React.useState<IntakeRow | null>(null)
  const [cloneName, setCloneName] = React.useState('')
  const [detailsIntake, setDetailsIntake] = React.useState<IntakeRow | null>(null)
  const [detailsForm, setDetailsForm] = React.useState({
    name: '',
    intakeMonth: '',
    intakeYear: '',
    applicationDeadline: '',
    courseStartDate: '',
    applicationOpenDate: '',
    tuitionFeeAmount: '',
    tuitionFeeCurrency: 'EUR',
    requirementsNotes: '',
    status: 'upcoming',
  })

  const canCreate = usePermission('intakes', 'create')
  const canEdit = usePermission('intakes', 'edit')
  const canDelete = usePermission('intakes', 'delete')

  const [page, setPage] = React.useState(1)
  React.useEffect(() => { setPage(1) }, [universityFilter, courseFilter, statusFilter])

  // Lightweight, single request -- just for the "All Universities" filter and the Create
  // Intake form's university picker. Never fans out per-university/per-course requests (that
  // pattern, used here previously -- one request per university, then ANOTHER per course on
  // top of that -- is what overloaded the backend once the catalog held 2,600+ courses).
  const universitiesQuery = useQuery({
    queryKey: ['admin', 'universities', 'picker'],
    queryFn: async () => (await fetchAdminUniversitiesLive({ perPage: 250 })).universities ?? [],
    staleTime: 60_000,
  })

  // Courses for the currently-selected filter university, fetched only when one is chosen --
  // scoped to a single university this stays a cheap single request either way.
  const filterCoursesQuery = useQuery({
    queryKey: ['admin', 'university-courses', universityFilter],
    queryFn: () => fetchAdminUniversityCourses(universityFilter),
    enabled: !!universityFilter,
    staleTime: 30_000,
  })

  // Same idea, scoped to whichever university is chosen inside the Create Intake form --
  // independent from the filter above since the two can differ at the same time.
  const formCoursesQuery = useQuery({
    queryKey: ['admin', 'university-courses', form.universityPublicId],
    queryFn: () => fetchAdminUniversityCourses(form.universityPublicId),
    enabled: !!form.universityPublicId,
    staleTime: 30_000,
  })

  const catalogQuery = useQuery({
    queryKey: ['admin', 'catalog', 'intakes', page, universityFilter, courseFilter, statusFilter],
    queryFn: async () => {
      const result = await fetchAdminIntakesAll({
        page,
        perPage: PER_PAGE,
        universityId: universityFilter || undefined,
        courseId: courseFilter || undefined,
        status: statusFilter || undefined,
      })
      return { intakes: result.intakes as IntakeRow[], meta: result.meta }
    },
    staleTime: 30_000,
  })

  const invalidateCatalog = () => queryClient.invalidateQueries({ queryKey: ['admin', 'catalog'] })

  const createMutation = useMutation({
    mutationFn: ({ coursePublicId, payload }: { coursePublicId: string; payload: Record<string, unknown> }) =>
      createAdminCourseIntake(coursePublicId, payload),
    onSuccess: () => {
      toast.success('Intake created successfully.')
      setIsAddOpen(false)
      setForm(INITIAL_FORM)
      void invalidateCatalog()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create intake.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ publicId, payload }: { publicId: string; payload: Record<string, unknown> }) =>
      updateAdminIntakeLive(publicId, payload),
    onSuccess: () => void invalidateCatalog(),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update intake.'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ publicId, status }: { publicId: string; status: string }) => updateAdminIntakeStatus(publicId, { status }),
    onSuccess: () => {
      toast.success('Intake status updated.')
      void invalidateCatalog()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update intake status.'),
  })

  const cloneMutation = useMutation({
    mutationFn: ({ publicId, name }: { publicId: string; name?: string }) => cloneAdminIntake(publicId, name ? { name } : undefined),
    onSuccess: () => {
      toast.success('Intake cloned successfully — update its fee and dates for the new term.')
      setCloningIntake(null)
      void invalidateCatalog()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to clone intake.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdminIntakeLive,
    onSuccess: () => {
      toast.success('Intake deleted.')
      void invalidateCatalog()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to delete intake.'),
  })

  const universities = (universitiesQuery.data ?? []) as UniversityRow[]
  const intakes = (catalogQuery.data?.intakes ?? []) as IntakeRow[]
  const meta = catalogQuery.data?.meta

  const availableCourses = (filterCoursesQuery.data ?? []) as CourseRow[]
  const formCourses = (formCoursesQuery.data ?? []) as CourseRow[]

  function openCloneDialog(row: IntakeRow) {
    setCloningIntake(row)
    setCloneName(`${row.name} (Copy)`)
  }

  function openDetailsPanel(row: IntakeRow) {
    setDetailsIntake(row)
    setDetailsForm({
      name: row.name,
      intakeMonth: row.intake_month != null ? String(row.intake_month) : '',
      intakeYear: row.intake_year != null ? String(row.intake_year) : '',
      applicationDeadline: toDateInputValue(row.application_deadline),
      courseStartDate: toDateInputValue(row.course_start_date),
      applicationOpenDate: toDateInputValue(row.application_open_date),
      tuitionFeeAmount: row.tuition_fee_amount != null ? String(row.tuition_fee_amount) : '',
      tuitionFeeCurrency: row.tuition_fee_currency || 'EUR',
      requirementsNotes: row.requirements_notes || '',
      status: row.status,
    })
  }

  const columns: ColumnDef<IntakeRow>[] = [
    {
      key: 'intake',
      header: 'Intake / Course',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <UniversityLogo name={row.university_name} logoThumbUrl={row.university_logo_thumb_url} size="sm" />
          <div>
            <EditableField
              value={row.name}
              className="font-semibold text-brand-navy"
              onSave={(v) => updateMutation.mutateAsync({ publicId: row.public_id, payload: { name: v } })}
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">{row.course_name} · {row.university_name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'deadline',
      header: 'Application Deadline',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-brand-orange-accessible shrink-0" />
          <EditableField
            value={toDateInputValue(row.application_deadline)}
            emptyLabel="Not set"
            render={() => <span>{formatDate(row.application_deadline)}</span>}
            onSave={(v) => updateMutation.mutateAsync({ publicId: row.public_id, payload: { application_deadline: v || null } })}
            disabled={!canEdit}
          />
        </div>
      ),
    },
    {
      key: 'fee',
      header: 'Tuition Fee',
      cell: (row) => (
        <EditableField
          value={row.tuition_fee_amount != null ? String(row.tuition_fee_amount) : ''}
          emptyLabel="Not set"
          render={() => <span>{row.tuition_fee_amount == null ? 'Not set' : `${row.tuition_fee_currency || 'EUR'} ${row.tuition_fee_amount}`}</span>}
          onSave={(v) => updateMutation.mutateAsync({ publicId: row.public_id, payload: { tuition_fee_amount: v ? Number(v) : null } })}
          disabled={!canEdit}
        />
      ),
    },
    {
      key: 'applications',
      header: 'Applications',
      cell: (row) => <span className="font-semibold text-brand-navy">{row.application_count ?? 0}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => renderStatus(row.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => {
        const nextOptions = validNextStatuses(row.status)
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineActions
              actions={[
                { label: 'Clone Intake', icon: Copy, onClick: () => openCloneDialog(row), hidden: !canCreate },
                ...nextOptions.map((next) => ({
                  label: `Move to ${next[0].toUpperCase()}${next.slice(1)}`,
                  icon: ArrowUpRight,
                  onClick: () => statusMutation.mutate({ publicId: row.public_id, status: next }),
                  hidden: !canEdit,
                })),
                { label: 'Edit Intake', icon: Pencil, onClick: () => openDetailsPanel(row), hidden: !canEdit },
                { label: 'Delete Intake', icon: Trash, onClick: () => { if (window.confirm(`Delete ${row.name}?`)) deleteMutation.mutate(row.public_id) }, variant: 'danger', hidden: !canDelete },
              ]}
            />
          </div>
        )
      },
    },
  ]

  function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!form.coursePublicId) {
      toast.error('Select a course for the intake.')
      return
    }

    createMutation.mutate({
      coursePublicId: form.coursePublicId,
      payload: {
        name: form.name,
        intake_month: Number(form.intakeMonth),
        intake_year: Number(form.intakeYear),
        application_deadline: form.applicationDeadline || null,
        course_start_date: form.courseStartDate || null,
        tuition_fee_amount: form.tuitionFeeAmount ? Number(form.tuitionFeeAmount) : null,
        tuition_fee_currency: form.tuitionFeeCurrency,
        requirements_notes: form.requirementsNotes || null,
        status: form.status,
      },
    })
  }

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Academic Intakes"
        subtitle="Manage live seasonal enrollment windows and deadlines."
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Intake
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col lg:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm items-center">
        <select
          value={universityFilter}
          onChange={(e) => {
            setUniversityFilter(e.target.value)
            setCourseFilter('')
          }}
          className="w-full lg:w-64 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        >
          <option value="">All Universities</option>
          {universities.map((university) => (
            <option key={university.public_id} value={university.public_id}>{university.name}</option>
          ))}
        </select>

        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="w-full lg:w-72 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        >
          <option value="">All Courses</option>
          {availableCourses.map((course) => (
            <option key={course.public_id} value={course.public_id}>{course.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full lg:w-48 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <p className="text-xs text-muted-foreground">Double-click the intake name, deadline, or fee to edit in place. Use "Edit Intake" in the Actions menu to change status or edit every field at once.</p>

      {catalogQuery.isError ? (
        <EmptyState
          heading="Intakes could not be loaded"
          description={catalogQuery.error instanceof Error ? catalogQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => catalogQuery.refetch()}>Retry</Button>}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={intakes}
            isLoading={catalogQuery.isLoading}
            emptyMessage="No academic intakes match the current criteria."
          />
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}

      <SlideOverPanel title="Create Academic Intake" open={isAddOpen} onOpenChange={setIsAddOpen}>
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">University</label>
              <select
                required
                value={form.universityPublicId}
                onChange={(e) => setForm((current) => ({ ...current, universityPublicId: e.target.value, coursePublicId: '' }))}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                <option value="">Select university</option>
                {universities.map((university) => (
                  <option key={university.public_id} value={university.public_id}>{university.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Associated Course</label>
              <select
                required
                value={form.coursePublicId}
                onChange={(e) => setForm((current) => ({ ...current, coursePublicId: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                <option value="">Select course</option>
                {formCourses.map((course) => (
                  <option key={course.public_id} value={course.public_id}>{course.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Intake Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Intake Month</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  required
                  value={form.intakeMonth}
                  onChange={(e) => setForm((current) => ({ ...current, intakeMonth: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Intake Year</label>
                <input
                  type="number"
                  min={2024}
                  max={2035}
                  required
                  value={form.intakeYear}
                  onChange={(e) => setForm((current) => ({ ...current, intakeYear: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Application Deadline</label>
                <input
                  type="date"
                  value={form.applicationDeadline}
                  onChange={(e) => setForm((current) => ({ ...current, applicationDeadline: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Course Start Date</label>
                <input
                  type="date"
                  value={form.courseStartDate}
                  onChange={(e) => setForm((current) => ({ ...current, courseStartDate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Tuition Fee Amount</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.tuitionFeeAmount}
                  onChange={(e) => setForm((current) => ({ ...current, tuitionFeeAmount: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Currency</label>
                <input
                  type="text"
                  value={form.tuitionFeeCurrency}
                  onChange={(e) => setForm((current) => ({ ...current, tuitionFeeCurrency: e.target.value.toUpperCase() }))}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Initial Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                <option value="upcoming">Upcoming</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Requirements Notes</label>
              <textarea
                value={form.requirementsNotes}
                onChange={(e) => setForm((current) => ({ ...current, requirementsNotes: e.target.value }))}
                rows={4}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={createMutation.isPending}>Create Intake</Button>
          </div>
        </form>
      </SlideOverPanel>

      <Modal open={!!cloningIntake} onOpenChange={(open) => !open && setCloningIntake(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Clone "{cloningIntake?.name}"</ModalTitle>
            <p className="text-sm text-muted-foreground">
              Creates a new intake for the same course with the year incremented. Update its fee and dates afterward.
            </p>
          </ModalHeader>
          <div>
            <label className="text-xs font-semibold text-brand-navy block mb-1">New Intake Name</label>
            <input
              autoFocus
              type="text"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            />
          </div>
          <ModalFooter>
            <ModalCancel />
            <Button
              variant="primary"
              disabled={cloneMutation.isPending}
              onClick={() => cloningIntake && cloneMutation.mutate({ publicId: cloningIntake.public_id, name: cloneName.trim() || undefined })}
            >
              Clone Intake
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <SlideOverPanel title="Edit Intake" open={!!detailsIntake} onOpenChange={(open) => !open && setDetailsIntake(null)}>
        {detailsIntake && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateMutation.mutate({
                publicId: detailsIntake.public_id,
                payload: {
                  name: detailsForm.name,
                  intake_month: detailsForm.intakeMonth ? Number(detailsForm.intakeMonth) : null,
                  intake_year: detailsForm.intakeYear ? Number(detailsForm.intakeYear) : null,
                  application_deadline: detailsForm.applicationDeadline || null,
                  course_start_date: detailsForm.courseStartDate || null,
                  application_open_date: detailsForm.applicationOpenDate || null,
                  tuition_fee_amount: detailsForm.tuitionFeeAmount ? Number(detailsForm.tuitionFeeAmount) : null,
                  tuition_fee_currency: detailsForm.tuitionFeeCurrency,
                  requirements_notes: detailsForm.requirementsNotes || null,
                },
              })
              if (detailsForm.status !== detailsIntake.status) {
                statusMutation.mutate({ publicId: detailsIntake.public_id, status: detailsForm.status })
              }
              setDetailsIntake(null)
            }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Intake Name</label>
                <input type="text" required value={detailsForm.name} onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-brand-navy block mb-1">Intake Month</label>
                  <input type="number" min={1} max={12} value={detailsForm.intakeMonth} onChange={(e) => setDetailsForm({ ...detailsForm, intakeMonth: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-navy block mb-1">Intake Year</label>
                  <input type="number" min={2024} max={2035} value={detailsForm.intakeYear} onChange={(e) => setDetailsForm({ ...detailsForm, intakeYear: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Application Deadline</label>
                <input type="date" value={detailsForm.applicationDeadline} onChange={(e) => setDetailsForm({ ...detailsForm, applicationDeadline: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Application Opens</label>
                <input type="date" value={detailsForm.applicationOpenDate} onChange={(e) => setDetailsForm({ ...detailsForm, applicationOpenDate: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Course Start Date</label>
                <input type="date" value={detailsForm.courseStartDate} onChange={(e) => setDetailsForm({ ...detailsForm, courseStartDate: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-brand-navy block mb-1">Tuition Fee Amount</label>
                  <input type="number" min={0} step="0.01" value={detailsForm.tuitionFeeAmount} onChange={(e) => setDetailsForm({ ...detailsForm, tuitionFeeAmount: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-navy block mb-1">Fee Currency</label>
                  <input type="text" value={detailsForm.tuitionFeeCurrency} onChange={(e) => setDetailsForm({ ...detailsForm, tuitionFeeCurrency: e.target.value.toUpperCase() })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Status</label>
                <select
                  value={detailsForm.status}
                  disabled={validNextStatuses(detailsIntake.status).length === 0}
                  onChange={(e) => setDetailsForm({ ...detailsForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none disabled:opacity-60"
                >
                  <option value={detailsIntake.status}>{detailsIntake.status[0].toUpperCase()}{detailsIntake.status.slice(1)} (current)</option>
                  {validNextStatuses(detailsIntake.status).map((s) => (
                    <option key={s} value={s}>{s[0].toUpperCase()}{s.slice(1)}</option>
                  ))}
                </select>
                {validNextStatuses(detailsIntake.status).length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Closed intakes cannot be reopened.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Requirements Notes</label>
                <textarea rows={4} value={detailsForm.requirementsNotes} onChange={(e) => setDetailsForm({ ...detailsForm, requirementsNotes: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
              </div>
            </div>
            <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setDetailsIntake(null)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
            </div>
          </form>
        )}
      </SlideOverPanel>
    </PageWrapper>
  )
}
