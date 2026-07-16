import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Plus, Search, Trash } from 'lucide-react'
import { createAdminUniversityCourse, deleteAdminCourseLive, fetchAdminCoursesAll, fetchAdminUniversitiesLive, updateAdminCourseLive } from '../../lib/api'
import { useCampusPicker } from '../../shared/hooks/useCampusPicker'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { Pagination } from '../../shared/components/ui/Pagination'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { EditableField } from '../../shared/components/ui/EditableField'
import { UniversityLogo } from '../../shared/components/catalog/UniversityLogo'
import { Modal, ModalAction, ModalCancel, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '../../shared/components/ui/Modal'
import { usePermission } from '../../hooks/usePermission'
import { toast } from 'sonner'
import { useUrlFilters, useDebouncedFilterSync } from '../../shared/hooks/useUrlFilters'
import { ClearFiltersButton } from '../../shared/components/ui/ClearFiltersButton'

const PER_PAGE = 20

const DEGREE_OPTIONS = [
  { value: 'certificate', label: 'Certificate' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'bachelors', label: "Bachelor's" },
  { value: 'masters', label: "Master's" },
  { value: 'phd', label: 'PhD' },
]

interface CourseRow {
  public_id: string
  university_public_id: string
  university_name: string
  university_logo_thumb_url?: string | null
  name: string
  degree_level: string
  duration_months: number | null
  language: string | null
  status: string
}

export default function AdminCoursesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canWrite = usePermission('courses', 'edit')
  const { filters, setFilters, clearFilters, hasActiveFilters } = useUrlFilters({
    university: '', campus: '', search: '', page: '1',
  })
  const universityFilter = filters.university
  const campusFilter = filters.campus
  const page = Number(filters.page) || 1
  const setUniversityFilter = (v: string) => setFilters({ university: v, campus: '', page: '1' })
  const setCampusFilter = (v: string) => setFilters({ campus: v, page: '1' })
  const setPage = (updater: number | ((p: number) => number)) => {
    const next = typeof updater === 'function' ? (updater as (p: number) => number)(page) : updater
    setFilters({ page: String(next) })
  }

  const [searchQuery, setSearchQuery] = React.useState(filters.search)
  const debouncedSearch = filters.search
  useDebouncedFilterSync(searchQuery, (v) => setFilters({ search: v, page: '1' }))

  const handleClearFilters = () => {
    clearFilters()
    setSearchQuery('')
  }

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [form, setForm] = React.useState({ universityPublicId: '', campusPublicId: '', name: '', degree_level: 'masters', duration_months: 24, language: 'English' })
  const [deleteTarget, setDeleteTarget] = React.useState<CourseRow | null>(null)

  // Institution-level (grouped) picker — one option per institution, not per campus row. Also
  // fixes a real bug: the old flat picker capped at per_page=250 while the catalog holds 313+
  // individual campus rows, so ~60 campuses were silently unselectable. per_page=1000 here is
  // generous headroom against further catalog growth, same pattern as fetchAdminUniversityCourses.
  const universitiesQuery = useQuery({
    queryKey: ['admin', 'universities', 'picker', 'grouped'],
    queryFn: async () => (await fetchAdminUniversitiesLive({ perPage: 1000, view: 'grouped' })).universities ?? [],
    staleTime: 60_000,
  })

  // Resolves the picked institution down to one specific campus row — a course always belongs to
  // exactly one campus, never a whole institution. Filter and Add-Course-form get independent
  // instances since a user can have different selections open in each at the same time.
  const filterCampusPicker = useCampusPicker(universityFilter)
  const formCampusPicker = useCampusPicker(form.universityPublicId)
  const effectiveUniversityId = filterCampusPicker.resolveEffectiveCampusId(campusFilter)

  const catalogQuery = useQuery({
    queryKey: ['admin', 'catalog', 'courses', page, debouncedSearch, effectiveUniversityId],
    queryFn: async () => {
      const result = await fetchAdminCoursesAll({
        page,
        perPage: PER_PAGE,
        q: debouncedSearch || undefined,
        universityId: effectiveUniversityId || undefined,
      })
      const courses = result.courses.map((course: any) => ({
        ...course,
        university_public_id: course.university_public_id,
        university_name: course.university_name,
      }))
      return { courses, meta: result.meta }
    },
    staleTime: 30_000,
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'catalog'] })

  const createMutation = useMutation({
    mutationFn: ({ universityPublicId, payload }: { universityPublicId: string; payload: Record<string, any> }) => createAdminUniversityCourse(universityPublicId, payload),
    onSuccess: () => {
      toast.success('Course added successfully.')
      setIsAddOpen(false)
      invalidate()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create course.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ publicId, payload }: { publicId: string; payload: Record<string, any> }) => updateAdminCourseLive(publicId, payload),
    onSuccess: invalidate,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update course.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCourseLive,
    onSuccess: () => { toast.success('Course deleted.'); setDeleteTarget(null); invalidate() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to delete course.'),
  })

  const universities = (universitiesQuery.data ?? []) as any[]

  // Institution-level options (one per university, not per campus row). City suffix still helps
  // disambiguate same-name institutions in different cities/countries.
  function universityOptionLabel(u: any) {
    return u.city ? `${u.name} — ${u.city}` : u.name
  }

  // Campus dropdown options — only rendered when the picked institution has more than one campus.
  function campusOptionLabel(c: any) {
    return c.city ? `${c.city}, ${c.country}` : (c.country ?? c.name)
  }
  const courses = (catalogQuery.data?.courses ?? []) as CourseRow[]
  const meta = catalogQuery.data?.meta

  const columns: ColumnDef<CourseRow>[] = [
    {
      key: 'course',
      header: 'Course',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <UniversityLogo name={row.university_name} logoThumbUrl={row.university_logo_thumb_url} size="sm" />
          <div>
            <EditableField
              value={row.name}
              className="font-semibold text-brand-navy"
              onSave={(v) => updateMutation.mutateAsync({ publicId: row.public_id, payload: { name: v } })}
              disabled={!canWrite}
            />
            <button
              className="text-xs text-muted-foreground hover:text-brand-orange-accessible flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); navigate(`/portal/admin/universities/${row.university_public_id}`) }}
            >
              {row.university_name}<ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
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
          onSave={(v) => updateMutation.mutateAsync({ publicId: row.public_id, payload: { degree_level: v } })}
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
          emptyLabel="Not set"
          onSave={(v) => updateMutation.mutateAsync({ publicId: row.public_id, payload: { duration_months: Number(v) || null } })}
          disabled={!canWrite}
        />
      ),
    },
    {
      key: 'language',
      header: 'Language',
      cell: (row) => (
        <EditableField
          value={row.language ?? ''}
          emptyLabel="English"
          onSave={(v) => updateMutation.mutateAsync({ publicId: row.public_id, payload: { language: v || 'English' } })}
          disabled={!canWrite}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <button
          title="Click to toggle status"
          disabled={!canWrite}
          className="cursor-pointer disabled:cursor-default"
          onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ publicId: row.public_id, payload: { status: row.status === 'active' ? 'inactive' : 'active' } }) }}
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
              setDeleteTarget(row)
            }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        ) : null
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader title="Courses Catalog" subtitle="Manage live program offerings across university partners." actions={canWrite ? <Button variant="primary" onClick={() => setIsAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Course</Button> : undefined} />

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 bg-surface-card p-4 rounded-xl border border-border-warm items-center justify-between">
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <select value={universityFilter} onChange={(e) => setUniversityFilter(e.target.value)} className="w-full sm:w-64 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none">
            <option value="">All Universities</option>
            {universities.map((u) => <option key={u.public_id} value={u.public_id}>{universityOptionLabel(u)}</option>)}
          </select>
          {filterCampusPicker.needsCampusStep && (
            <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="w-full sm:w-56 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none">
              <option value="">Select campus…</option>
              {filterCampusPicker.campuses.map((c) => <option key={c.public_id} value={c.public_id}>{campusOptionLabel(c)}</option>)}
            </select>
          )}
          {hasActiveFilters && <ClearFiltersButton className="" onClick={handleClearFilters} />}
        </div>
        <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input type="text" placeholder="Search courses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" /></div>
      </div>

      {canWrite && <p className="text-xs text-muted-foreground">Double-click a cell to edit it in place — changes save immediately.</p>}

      {catalogQuery.isError ? (
        <EmptyState heading="Courses could not be loaded" description={catalogQuery.error instanceof Error ? catalogQuery.error.message : 'The backend request failed.'} action={<Button onClick={() => catalogQuery.refetch()}>Retry</Button>} />
      ) : (
        <>
          <DataTable columns={columns} data={courses} isLoading={catalogQuery.isLoading} emptyMessage="No courses match the current criteria." />
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}

      <SlideOverPanel title="Add New Course" open={isAddOpen} onOpenChange={setIsAddOpen}>
        <form onSubmit={(e) => {
          e.preventDefault()
          const effectiveId = formCampusPicker.resolveEffectiveCampusId(form.campusPublicId)
          if (!effectiveId) {
            toast.error(formCampusPicker.needsCampusStep ? 'Select a campus for this university.' : 'Select a university.')
            return
          }
          createMutation.mutate({ universityPublicId: effectiveId, payload: { name: form.name, degree_level: form.degree_level, duration_months: form.duration_months, language: form.language } })
        }} className="space-y-6">
          <div className="space-y-4">
            <div><label className="text-xs font-semibold text-brand-navy block mb-1">Course Name</label><input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" /></div>
            <div><label className="text-xs font-semibold text-brand-navy block mb-1">University</label><select required value={form.universityPublicId} onChange={(e) => setForm({ ...form, universityPublicId: e.target.value, campusPublicId: '' })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"><option value="">Select university</option>{universities.map((u) => <option key={u.public_id} value={u.public_id}>{universityOptionLabel(u)}</option>)}</select></div>
            {formCampusPicker.needsCampusStep && (
              <div><label className="text-xs font-semibold text-brand-navy block mb-1">Campus</label><select required value={form.campusPublicId} onChange={(e) => setForm({ ...form, campusPublicId: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"><option value="">Select campus</option>{formCampusPicker.campuses.map((c) => <option key={c.public_id} value={c.public_id}>{campusOptionLabel(c)}</option>)}</select></div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold text-brand-navy block mb-1">Degree Level</label><select value={form.degree_level} onChange={(e) => setForm({ ...form, degree_level: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none">{DEGREE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
              <div><label className="text-xs font-semibold text-brand-navy block mb-1">Duration (months)</label><input type="number" min={1} value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: Number(e.target.value) })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" /></div>
            </div>
            <div><label className="text-xs font-semibold text-brand-navy block mb-1">Language</label><input type="text" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" /></div>
          </div>
          <div className="pt-6 border-t border-border-warm flex justify-end gap-2"><Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button variant="primary" type="submit" disabled={createMutation.isPending}>Save Course</Button></div>
        </form>
      </SlideOverPanel>

      <Modal open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete "{deleteTarget?.name}"?</ModalTitle>
            <ModalDescription>
              This permanently removes the course and closes all of its intakes. Students with active applications under this course will be unaffected, but no new applications can be started against it. This cannot be undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <ModalCancel />
            <ModalAction
              variant="danger"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.public_id) }}
            >
              <Trash className="mr-1.5 h-4 w-4" />
              Delete Course
            </ModalAction>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageWrapper>
  )
}
