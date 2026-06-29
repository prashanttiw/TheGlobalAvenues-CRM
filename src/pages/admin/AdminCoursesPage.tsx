import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Plus, Search, Trash } from 'lucide-react'
import { createAdminUniversityCourse, deleteAdminCourseLive, fetchAdminUniversitiesLive, fetchAdminUniversityCourses, updateAdminCourseLive } from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { toast } from 'sonner'

interface CourseRow {
  public_id: string
  university_public_id: string
  university_name: string
  name: string
  degree_level: string
  duration_months: number | null
  status: string
}

export default function AdminCoursesPage() {
  const queryClient = useQueryClient()
  const [universityFilter, setUniversityFilter] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [form, setForm] = React.useState({ universityPublicId: '', name: '', degree_level: 'Masters', duration_months: 24, language: 'English' })

  const catalogQuery = useQuery({
    queryKey: ['admin', 'catalog', 'courses'],
    queryFn: async () => {
      const universitiesResult = await fetchAdminUniversitiesLive({ perPage: 100 })
      const universities = universitiesResult.universities ?? []
      const courseBatches = await Promise.all(universities.map(async (university: any) => {
        const result = await fetchAdminUniversityCourses(university.public_id, { perPage: 100 })
        return result.courses.map((course: any) => ({ ...course, university_public_id: university.public_id, university_name: university.name }))
      }))
      return { universities, courses: courseBatches.flat() }
    },
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: ({ universityPublicId, payload }: { universityPublicId: string; payload: Record<string, any> }) => createAdminUniversityCourse(universityPublicId, payload),
    onSuccess: () => {
      toast.success('Course added successfully.')
      setIsAddOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'catalog'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create course.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ publicId, payload }: { publicId: string; payload: Record<string, any> }) => updateAdminCourseLive(publicId, payload),
    onSuccess: () => {
      toast.success('Course updated.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'catalog'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update course.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCourseLive,
    onSuccess: () => {
      toast.success('Course deleted.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'catalog'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to delete course.'),
  })

  const universities = (catalogQuery.data?.universities ?? []) as any[]
  const courses = ((catalogQuery.data?.courses ?? []) as CourseRow[]).filter((course) => {
    const matchesUniversity = !universityFilter || course.university_public_id === universityFilter
    const matchesSearch = !searchQuery || `${course.name} ${course.degree_level}`.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesUniversity && matchesSearch
  })

  const columns: ColumnDef<CourseRow>[] = [
    { key: 'course', header: 'Course Details', cell: (row) => <div><p className="font-semibold text-brand-navy">{row.name}</p><p className="text-xs text-muted-foreground">{row.university_name}</p></div> },
    { key: 'degree', header: 'Degree / Duration', cell: (row) => <div><p className="text-sm text-brand-navy">{row.degree_level || 'Not set'}</p><p className="text-xs text-muted-foreground">{row.duration_months ? `${row.duration_months} months` : 'Duration not set'}</p></div> },
    { key: 'status', header: 'Status', cell: (row) => <Badge variant={row.status === 'active' ? 'secondary' : 'outline'}>{row.status}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineActions actions={[
            { label: 'Edit Course', icon: Edit, onClick: () => {
              const newName = window.prompt('Course name', row.name)
              if (!newName?.trim()) return
              updateMutation.mutate({ publicId: row.public_id, payload: { name: newName.trim() } })
            } },
            { label: row.status === 'active' ? 'Disable Course' : 'Enable Course', onClick: () => updateMutation.mutate({ publicId: row.public_id, payload: { status: row.status === 'active' ? 'inactive' : 'active' } }) },
            { label: 'Delete Course', icon: Trash, onClick: () => deleteMutation.mutate(row.public_id), variant: 'danger' },
          ]} />
        </div>
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader title="Courses Catalog" subtitle="Manage live program offerings across university partners." actions={<Button variant="primary" onClick={() => setIsAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Course</Button>} />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm items-center justify-between">
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <select value={universityFilter} onChange={(e) => setUniversityFilter(e.target.value)} className="w-full sm:w-64 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none">
            <option value="">All Universities</option>
            {universities.map((u) => <option key={u.public_id} value={u.public_id}>{u.name}</option>)}
          </select>
        </div>
        <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input type="text" placeholder="Search courses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" /></div>
      </div>

      {catalogQuery.isError ? <EmptyState heading="Courses could not be loaded" description={catalogQuery.error instanceof Error ? catalogQuery.error.message : 'The backend request failed.'} action={<Button onClick={() => catalogQuery.refetch()}>Retry</Button>} /> : <DataTable columns={columns} data={courses} isLoading={catalogQuery.isLoading} emptyMessage="No courses match the current criteria." />}

      <SlideOverPanel title="Add New Course" open={isAddOpen} onOpenChange={setIsAddOpen}>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ universityPublicId: form.universityPublicId, payload: { name: form.name, degree_level: form.degree_level, duration_months: form.duration_months, language: form.language } }) }} className="space-y-6">
          <div className="space-y-4">
            <div><label className="text-xs font-semibold text-brand-navy block mb-1">Course Name</label><input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" /></div>
            <div><label className="text-xs font-semibold text-brand-navy block mb-1">University</label><select required value={form.universityPublicId} onChange={(e) => setForm({ ...form, universityPublicId: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"><option value="">Select university</option>{universities.map((u) => <option key={u.public_id} value={u.public_id}>{u.name}</option>)}</select></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold text-brand-navy block mb-1">Degree Level</label><select value={form.degree_level} onChange={(e) => setForm({ ...form, degree_level: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"><option value="Bachelors">Bachelors</option><option value="Masters">Masters</option><option value="PhD">PhD</option><option value="Diploma">Diploma</option></select></div>
              <div><label className="text-xs font-semibold text-brand-navy block mb-1">Duration (months)</label><input type="number" min={1} value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: Number(e.target.value) })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" /></div>
            </div>
          </div>
          <div className="pt-6 border-t border-border-warm flex justify-end gap-2"><Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button variant="primary" type="submit">Save Course</Button></div>
        </form>
      </SlideOverPanel>
    </PageWrapper>
  )
}
