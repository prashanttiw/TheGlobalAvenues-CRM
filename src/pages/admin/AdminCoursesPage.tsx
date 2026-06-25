import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { Plus, BookOpen, Trash, Edit, Search } from 'lucide-react'
import { toast } from 'sonner'
import { usePermission } from '../../hooks/usePermission'

interface Course {
  id: string
  name: string
  universityId: string
  universityName: string
  degree: string
  duration: string
  tuitionFee: string
  intakes: string
  status: StatusType
}

const MOCK_UNIVERSITIES = [
  { id: 'univ-1', name: 'University of Toronto' },
  { id: 'univ-2', name: 'Technical University of Vienna' },
  { id: 'univ-3', name: 'University of Nicosia' },
]

const MOCK_COURSES: Course[] = [
  {
    id: 'course-1',
    name: 'M.Sc. in Computer Science',
    universityId: 'univ-1',
    universityName: 'University of Toronto',
    degree: 'Masters',
    duration: '2 Years',
    tuitionFee: 'CAD 35,000 / Year',
    intakes: 'September, January',
    status: 'approved',
  },
  {
    id: 'course-2',
    name: 'B.Sc. in Software Engineering',
    universityId: 'univ-1',
    universityName: 'University of Toronto',
    degree: 'Bachelors',
    duration: '4 Years',
    tuitionFee: 'CAD 42,000 / Year',
    intakes: 'September',
    status: 'approved',
  },
  {
    id: 'course-3',
    name: 'M.Sc. in Data Science & AI',
    universityId: 'univ-2',
    universityName: 'Technical University of Vienna',
    degree: 'Masters',
    duration: '2 Years',
    tuitionFee: 'EUR 1,500 / Semester',
    intakes: 'October, March',
    status: 'approved',
  },
  {
    id: 'course-4',
    name: 'Master of Business Administration (MBA)',
    universityId: 'univ-3',
    universityName: 'University of Nicosia',
    degree: 'Masters',
    duration: '1.5 Years',
    tuitionFee: 'EUR 12,000 Total',
    intakes: 'September, February, June',
    status: 'pending',
  },
]

export default function AdminCoursesPage() {
  const [courses, setCourses] = React.useState<Course[]>(MOCK_COURSES)
  const [universityFilter, setUniversityFilter] = React.useState('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isAddOpen, setIsAddOpen] = React.useState(false)

  const canCreate = usePermission('courses', 'create')
  const canEdit = usePermission('courses', 'edit')
  const canDelete = usePermission('courses', 'delete')

  const [form, setForm] = React.useState({
    name: '',
    universityId: 'univ-1',
    degree: 'Masters',
    duration: '2 Years',
    tuitionFee: '',
    intakes: 'September',
    status: 'approved' as StatusType,
  })

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedUniv = MOCK_UNIVERSITIES.find(u => u.id === form.universityId)
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      name: form.name,
      universityId: form.universityId,
      universityName: selectedUniv ? selectedUniv.name : 'Unknown University',
      degree: form.degree,
      duration: form.duration,
      tuitionFee: form.tuitionFee || 'N/A',
      intakes: form.intakes,
      status: form.status,
    }
    setCourses([...courses, newCourse])
    setIsAddOpen(false)
    setForm({
      name: '',
      universityId: 'univ-1',
      degree: 'Masters',
      duration: '2 Years',
      tuitionFee: '',
      intakes: 'September',
      status: 'approved',
    })
    toast.success('Course added successfully!')
  }

  const handleDelete = (id: string, name: string) => {
    setCourses(courses.filter(c => c.id !== id))
    toast.success(`Deleted course: ${name}`)
  }

  const filteredCourses = courses.filter(c => {
    const matchesUniv = universityFilter === 'all' || c.universityId === universityFilter
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.degree.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesUniv && matchesSearch
  })

  const columns: ColumnDef<Course>[] = [
    {
      key: 'course',
      header: 'Course Details',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.universityName}</p>
        </div>
      ),
    },
    {
      key: 'degree',
      header: 'Degree / Duration',
      cell: (row) => (
        <div>
          <p className="text-sm text-brand-navy">{row.degree}</p>
          <p className="text-xs text-muted-foreground">{row.duration}</p>
        </div>
      ),
    },
    {
      key: 'tuition',
      header: 'Tuition Fee',
      cell: (row) => <span className="text-brand-navy text-sm font-medium">{row.tuitionFee}</span>,
    },
    {
      key: 'intakes',
      header: 'Intakes',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.intakes}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineActions 
            actions={[
              { 
                label: 'Edit Course', 
                icon: Edit, 
                onClick: () => toast.info(`Edit mode for: ${row.name}`),
                hidden: !canEdit 
              },
              { 
                label: 'Delete Course', 
                icon: Trash, 
                onClick: () => handleDelete(row.id, row.name), 
                variant: 'danger', 
                hidden: !canDelete 
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
        title="Courses Catalog" 
        subtitle="Manage program curriculum offerings and fees."
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm items-center justify-between">
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <select 
            value={universityFilter}
            onChange={(e) => setUniversityFilter(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            aria-label="Filter by University"
          >
            <option value="all">All Universities</option>
            {MOCK_UNIVERSITIES.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          />
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredCourses}
        emptyMessage="No courses match the current criteria."
      />

      <SlideOverPanel 
        title="Add New Course" 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen}
      >
        <form onSubmit={handleAddCourse} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Course Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. M.Sc. in Financial Engineering"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">University</label>
              <select
                value={form.universityId}
                onChange={(e) => setForm({ ...form, universityId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                {MOCK_UNIVERSITIES.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Degree Level</label>
                <select
                  value={form.degree}
                  onChange={(e) => setForm({ ...form, degree: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                >
                  <option value="Bachelors">Bachelors</option>
                  <option value="Masters">Masters</option>
                  <option value="PhD">PhD</option>
                  <option value="Diploma">Diploma</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Duration</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 2 Years"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Tuition Fee</label>
              <input 
                type="text" 
                required
                placeholder="e.g. CAD 35,000 / Year"
                value={form.tuitionFee}
                onChange={(e) => setForm({ ...form, tuitionFee: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Intakes</label>
              <input 
                type="text" 
                required
                placeholder="e.g. September, January"
                value={form.intakes}
                onChange={(e) => setForm({ ...form, intakes: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Approval Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StatusType })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Course</Button>
          </div>
        </form>
      </SlideOverPanel>
    </PageWrapper>
  )
}
