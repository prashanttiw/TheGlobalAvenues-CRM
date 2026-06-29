import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Copy, Edit, Plus, Trash } from 'lucide-react'
import {
  cloneAdminIntake,
  createAdminCourseIntake,
  deleteAdminIntakeLive,
  fetchAdminCourseIntakes,
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
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { toast } from 'sonner'

interface UniversityRow {
  public_id: string
  name: string
}

interface CourseRow {
  public_id: string
  name: string
  university_public_id: string
  university_name: string
}

interface IntakeRow {
  public_id: string
  name: string
  intake_month: number | null
  intake_year: number | null
  application_deadline: string | null
  course_start_date: string | null
  tuition_fee_amount: number | null
  tuition_fee_currency: string | null
  status: string
  application_count: number
  course_public_id: string
  course_name: string
  university_public_id: string
  university_name: string
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
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString()
}

function formatFee(row: IntakeRow) {
  if (row.tuition_fee_amount == null) return 'Not set'
  return `${row.tuition_fee_currency || 'EUR'} ${row.tuition_fee_amount}`
}

function renderStatus(status: string) {
  const variant = status === 'open' ? 'secondary' : status === 'closed' ? 'outline' : 'default'
  return <Badge variant={variant}>{status.replace(/_/g, ' ')}</Badge>
}

function nextStatus(status: string) {
  if (status === 'upcoming') return 'open'
  if (status === 'open') return 'closed'
  return null
}

export default function AdminIntakesPage() {
  const queryClient = useQueryClient()
  const [universityFilter, setUniversityFilter] = React.useState('')
  const [courseFilter, setCourseFilter] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [form, setForm] = React.useState<IntakeFormState>(INITIAL_FORM)

  const canCreate = usePermission('intakes', 'create')
  const canEdit = usePermission('intakes', 'edit')
  const canDelete = usePermission('intakes', 'delete')

  const catalogQuery = useQuery({
    queryKey: ['admin', 'catalog', 'intakes'],
    queryFn: async () => {
      const universitiesResult = await fetchAdminUniversitiesLive({ perPage: 100 })
      const universities = (universitiesResult.universities ?? []) as UniversityRow[]

      const courseBatches = await Promise.all(
        universities.map(async (university) => {
          const result = await fetchAdminUniversityCourses(university.public_id, { perPage: 100 })
          return (result.courses ?? []).map((course: any) => ({
            ...course,
            university_public_id: university.public_id,
            university_name: university.name,
          })) as CourseRow[]
        }),
      )

      const courses = courseBatches.flat()

      const intakeBatches = await Promise.all(
        courses.map(async (course) => {
          const result = await fetchAdminCourseIntakes(course.public_id, { perPage: 100 })
          return (result.intakes ?? []).map((intake: any) => ({
            ...intake,
            course_public_id: course.public_id,
            course_name: course.name,
            university_public_id: course.university_public_id,
            university_name: course.university_name,
          })) as IntakeRow[]
        }),
      )

      return { universities, courses, intakes: intakeBatches.flat() }
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
    onSuccess: () => {
      toast.success('Intake updated.')
      void invalidateCatalog()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update intake.'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ publicId, status }: { publicId: string; status: string }) => updateAdminIntakeStatus(publicId, status),
    onSuccess: () => {
      toast.success('Intake status updated.')
      void invalidateCatalog()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update intake status.'),
  })

  const cloneMutation = useMutation({
    mutationFn: ({ publicId, name }: { publicId: string; name?: string }) => cloneAdminIntake(publicId, name ? { name } : undefined),
    onSuccess: () => {
      toast.success('Intake cloned successfully.')
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

  const universities = (catalogQuery.data?.universities ?? []) as UniversityRow[]
  const courses = (catalogQuery.data?.courses ?? []) as CourseRow[]
  const intakes = ((catalogQuery.data?.intakes ?? []) as IntakeRow[]).filter((intake) => {
    const matchesUniversity = !universityFilter || intake.university_public_id === universityFilter
    const matchesCourse = !courseFilter || intake.course_public_id === courseFilter
    const matchesStatus = !statusFilter || intake.status === statusFilter
    return matchesUniversity && matchesCourse && matchesStatus
  })

  const availableCourses = courses.filter((course) => !universityFilter || course.university_public_id === universityFilter)
  const formCourses = courses.filter((course) => !form.universityPublicId || course.university_public_id === form.universityPublicId)

  const columns: ColumnDef<IntakeRow>[] = [
    {
      key: 'intake',
      header: 'Intake / Course',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.course_name} � {row.university_name}</p>
        </div>
      ),
    },
    {
      key: 'deadline',
      header: 'Application Deadline',
      cell: (row) => (
        <span className="text-sm font-medium text-brand-navy flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-brand-orange-accessible" />
          {formatDate(row.application_deadline)}
        </span>
      ),
    },
    {
      key: 'fee',
      header: 'Tuition Fee',
      cell: (row) => <span className="text-sm text-brand-navy">{formatFee(row)}</span>,
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
        const next = nextStatus(row.status)
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineActions
              actions={[
                {
                  label: 'Clone Intake',
                  icon: Copy,
                  onClick: () => {
                    const name = window.prompt('Clone name', `${row.name} (Copy)`)
                    if (name === null) return
                    cloneMutation.mutate({ publicId: row.public_id, name: name.trim() || undefined })
                  },
                  hidden: !canCreate,
                },
                {
                  label: next ? `Move to ${next}` : 'Status Finalized',
                  onClick: () => {
                    if (!next) return
                    statusMutation.mutate({ publicId: row.public_id, status: next })
                  },
                  hidden: !canEdit || !next,
                },
                {
                  label: 'Edit Intake',
                  icon: Edit,
                  onClick: () => {
                    const name = window.prompt('Intake name', row.name)
                    if (name === null) return
                    const deadline = window.prompt('Application deadline (YYYY-MM-DD)', row.application_deadline || '')
                    if (deadline === null) return
                    updateMutation.mutate({
                      publicId: row.public_id,
                      payload: {
                        name: name.trim() || row.name,
                        application_deadline: deadline.trim() || null,
                      },
                    })
                  },
                  hidden: !canEdit,
                },
                {
                  label: 'Delete Intake',
                  icon: Trash,
                  onClick: () => {
                    if (!window.confirm(`Delete ${row.name}?`)) return
                    deleteMutation.mutate(row.public_id)
                  },
                  variant: 'danger',
                  hidden: !canDelete,
                },
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

      {catalogQuery.isError ? (
        <EmptyState
          heading="Intakes could not be loaded"
          description={catalogQuery.error instanceof Error ? catalogQuery.error.message : 'The backend request failed.'}
          action={<Button onClick={() => catalogQuery.refetch()}>Retry</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={intakes}
          isLoading={catalogQuery.isLoading}
          emptyMessage="No academic intakes match the current criteria."
        />
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
    </PageWrapper>
  )
}
