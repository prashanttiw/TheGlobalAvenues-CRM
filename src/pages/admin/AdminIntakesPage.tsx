import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { Plus, Calendar, Copy, Trash, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { usePermission } from '../../hooks/usePermission'

interface Intake {
  id: string
  name: string
  year: number
  deadline: string
  fee: string
  status: StatusType
  applicationsCount: number
  courseName: string
}

const MOCK_INTAKES: Intake[] = [
  {
    id: 'intake-1',
    name: 'Fall Intake',
    year: 2026,
    deadline: '2026-07-01',
    fee: 'CAD 150',
    status: 'approved',
    applicationsCount: 18,
    courseName: 'M.Sc. in Computer Science',
  },
  {
    id: 'intake-2',
    name: 'Winter Intake',
    year: 2026,
    deadline: '2025-11-15',
    fee: 'CAD 150',
    status: 'approved',
    applicationsCount: 7,
    courseName: 'B.Sc. in Software Engineering',
  },
  {
    id: 'intake-3',
    name: 'Spring Intake',
    year: 2026,
    deadline: '2026-03-01',
    fee: 'EUR 100',
    status: 'pending',
    applicationsCount: 0,
    courseName: 'M.Sc. in Data Science & AI',
  },
]

export default function AdminIntakesPage() {
  const [intakes, setIntakes] = React.useState<Intake[]>(MOCK_INTAKES)
  const [courseFilter, setCourseFilter] = React.useState('all')
  const [isAddOpen, setIsAddOpen] = React.useState(false)

  const canCreate = usePermission('intakes', 'create')
  const canEdit = usePermission('intakes', 'edit')
  const canDelete = usePermission('intakes', 'delete')

  const [form, setForm] = React.useState({
    name: 'Fall Intake',
    year: 2026,
    deadline: '',
    fee: '',
    courseName: 'M.Sc. in Computer Science',
    status: 'approved' as StatusType,
  })

  const handleAddIntake = (e: React.FormEvent) => {
    e.preventDefault()
    const newIntake: Intake = {
      id: `intake-${Date.now()}`,
      name: form.name,
      year: Number(form.year),
      deadline: form.deadline || 'No Deadline',
      fee: form.fee || 'N/A',
      status: form.status,
      applicationsCount: 0,
      courseName: form.courseName,
    }
    setIntakes([...intakes, newIntake])
    setIsAddOpen(false)
    setForm({
      name: 'Fall Intake',
      year: 2026,
      deadline: '',
      fee: '',
      courseName: 'M.Sc. in Computer Science',
      status: 'approved',
    })
    toast.success('Intake created successfully!')
  }

  const handleClone = (intake: Intake) => {
    const nextYear = intake.year + 1
    const clonedDeadline = intake.deadline.replace(String(intake.year), String(nextYear))
    const cloned: Intake = {
      ...intake,
      id: `intake-${Date.now()}`,
      year: nextYear,
      deadline: clonedDeadline,
      applicationsCount: 0,
      status: 'pending',
    }
    setIntakes([...intakes, cloned])
    toast.success(`Cloned ${intake.name} to ${nextYear} intake as Pending.`)
  }

  const handleDelete = (id: string, name: string, year: number) => {
    setIntakes(intakes.filter(i => i.id !== id))
    toast.success(`Deleted intake: ${name} ${year}`)
  }

  const filteredIntakes = intakes.filter(i => {
    if (courseFilter === 'all') return true
    return i.courseName === courseFilter
  })

  const uniqueCourses = Array.from(new Set(intakes.map(i => i.courseName)))

  const columns: ColumnDef<Intake>[] = [
    {
      key: 'intake',
      header: 'Intake Name / Course',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.name} ({row.year})</p>
          <p className="text-xs text-muted-foreground">{row.courseName}</p>
        </div>
      ),
    },
    {
      key: 'deadline',
      header: 'Application Deadline',
      cell: (row) => (
        <span className="text-sm font-medium text-brand-navy flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-brand-orange-accessible" />
          {row.deadline}
        </span>
      ),
    },
    {
      key: 'fee',
      header: 'Application Fee',
      cell: (row) => <span className="text-sm text-brand-navy">{row.fee}</span>,
    },
    {
      key: 'applications',
      header: 'Applications',
      cell: (row) => <span className="font-semibold text-brand-navy">{row.applicationsCount}</span>,
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
                label: 'Clone to Next Year', 
                icon: Copy, 
                onClick: () => handleClone(row),
                hidden: !canEdit 
              },
              { 
                label: 'Edit Intake', 
                icon: Edit, 
                onClick: () => toast.info(`Editing intake details for: ${row.name}`),
                hidden: !canEdit 
              },
              { 
                label: 'Delete Intake', 
                icon: Trash, 
                onClick: () => handleDelete(row.id, row.name, row.year), 
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
        title="Academic Intakes" 
        subtitle="Manage seasonal enrollment application terms and deadlines."
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Intake
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm items-center">
        <select 
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          aria-label="Filter by Course"
        >
          <option value="all">All Associated Courses</option>
          {uniqueCourses.map(course => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredIntakes}
        emptyMessage="No academic intakes match the current criteria."
      />

      <SlideOverPanel 
        title="Create Academic Intake" 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen}
      >
        <form onSubmit={handleAddIntake} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Intake Name</label>
              <select
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                <option value="Fall Intake">Fall Intake</option>
                <option value="Winter Intake">Winter Intake</option>
                <option value="Spring Intake">Spring Intake</option>
                <option value="Summer Intake">Summer Intake</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Associated Course</label>
              <select
                value={form.courseName}
                onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                {uniqueCourses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Intake Year</label>
                <input 
                  type="number" 
                  required
                  min={2025}
                  max={2035}
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-brand-navy block mb-1">Application Fee</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. CAD 150"
                  value={form.fee}
                  onChange={(e) => setForm({ ...form, fee: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Deadline Date</label>
              <input 
                type="date" 
                required
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Intake Status</label>
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
            <Button variant="primary" type="submit">Create Intake</Button>
          </div>
        </form>
      </SlideOverPanel>
    </PageWrapper>
  )
}
