import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { Plus, Megaphone, Trash, Edit, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { usePermission } from '../../hooks/usePermission'

interface Notice {
  id: string
  title: string
  type: 'notice' | 'event'
  audiences: ('student' | 'agent' | 'admin')[]
  status: StatusType
  publishedDate: string
  content: string
}

const MOCK_NOTICES: Notice[] = [
  {
    id: 'notice-1',
    title: 'Autumn Intake Deadlines Extended',
    type: 'notice',
    audiences: ['student', 'agent'],
    status: 'approved',
    publishedDate: '2026-06-20',
    content: 'The deadline for applying to UK university partners has been extended to August 15th, 2026.',
  },
  {
    id: 'notice-2',
    title: 'Partner Agent Training Seminar',
    type: 'event',
    audiences: ['agent'],
    status: 'approved',
    publishedDate: '2026-06-18',
    content: 'Join our annual training seminar to learn about new visa processing rules. Located on Zoom.',
  },
  {
    id: 'notice-3',
    title: 'Scheduled System Maintenance',
    type: 'notice',
    audiences: ['student', 'agent', 'admin'],
    status: 'pending',
    publishedDate: '2026-06-25',
    content: 'The student and agent portals will undergo maintenance on Saturday from 2 AM to 4 AM IST.',
  },
]

export default function AdminNoticesPage() {
  const [notices, setNotices] = React.useState<Notice[]>(MOCK_NOTICES)
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'notice' | 'event'>('all')
  const [isAddOpen, setIsAddOpen] = React.useState(false)

  const canCreate = usePermission('notices', 'create')
  const canEdit = usePermission('notices', 'edit')
  const canDelete = usePermission('notices', 'delete')

  const [form, setForm] = React.useState({
    title: '',
    type: 'notice' as 'notice' | 'event',
    content: '',
    audiences: {
      student: true,
      agent: true,
      admin: false,
    },
    status: 'approved' as StatusType,
  })

  const handleAddNotice = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedAudiences: ('student' | 'agent' | 'admin')[] = []
    if (form.audiences.student) selectedAudiences.push('student')
    if (form.audiences.agent) selectedAudiences.push('agent')
    if (form.audiences.admin) selectedAudiences.push('admin')

    if (selectedAudiences.length === 0) {
      toast.error('Please select at least one target audience.')
      return
    }

    const newNotice: Notice = {
      id: `notice-${Date.now()}`,
      title: form.title,
      type: form.type,
      audiences: selectedAudiences,
      status: form.status,
      publishedDate: new Date().toISOString().split('T')[0],
      content: form.content,
    }

    setNotices([...notices, newNotice])
    setIsAddOpen(false)
    setForm({
      title: '',
      type: 'notice',
      content: '',
      audiences: {
        student: true,
        agent: true,
        admin: false,
      },
      status: 'approved',
    })
    toast.success('Notice published successfully!')
  }

  const handleDelete = (id: string, title: string) => {
    setNotices(notices.filter(n => n.id !== id))
    toast.success(`Deleted notice: ${title}`)
  }

  const filteredNotices = notices.filter(n => {
    if (typeFilter === 'all') return true
    return n.type === typeFilter
  })

  const columns: ColumnDef<Notice>[] = [
    {
      key: 'notice',
      header: 'Notice & Content',
      cell: (row) => (
        <div className="max-w-md">
          <p className="font-semibold text-brand-navy flex items-center gap-1.5">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${row.type === 'event' ? 'bg-amber-500' : 'bg-brand-orange-accessible'}`} />
            {row.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{row.content}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (row) => (
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
          row.type === 'event' 
            ? 'bg-amber-100 text-amber-800' 
            : 'bg-orange-100 text-orange-800'
        }`}>
          {row.type}
        </span>
      ),
    },
    {
      key: 'audiences',
      header: 'Target Audiences',
      cell: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.audiences.map(aud => (
            <span key={aud} className="text-[10px] uppercase font-semibold text-brand-navy bg-surface-warm px-1.5 py-0.5 rounded border border-border-warm">
              {aud}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Published',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.publishedDate}</span>,
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
                label: 'Edit Notice', 
                icon: Edit, 
                onClick: () => toast.info(`Editing notice: ${row.title}`),
                hidden: !canEdit 
              },
              { 
                label: 'Delete Notice', 
                icon: Trash, 
                onClick: () => handleDelete(row.id, row.title), 
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
        title="Notices & Events" 
        subtitle="Publish bulletins and scheduling events for students, agents, and staff."
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Publish Bulletins
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm items-center">
        <select 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="w-full sm:w-60 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          aria-label="Filter by Notice Type"
        >
          <option value="all">All Bulletins</option>
          <option value="notice">Notices Only</option>
          <option value="event">Events Only</option>
        </select>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredNotices}
        emptyMessage="No notices match the selected criteria."
      />

      <SlideOverPanel 
        title="Publish Announcement" 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen}
      >
        <form onSubmit={handleAddNotice} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Announcement Title</label>
              <input 
                type="text" 
                required
                placeholder="e.g. System Maintenance Notice"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Bulletin Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'notice' | 'event' })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                <option value="notice">Notice Announcement</option>
                <option value="event">Event Scheduling</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Target Audiences</label>
              <div className="space-y-2 bg-surface-warm p-3 rounded-lg border border-border-warm">
                <label className="flex items-center gap-2.5 text-sm text-brand-navy">
                  <input
                    type="checkbox"
                    checked={form.audiences.student}
                    onChange={(e) => setForm({ 
                      ...form, 
                      audiences: { ...form.audiences, student: e.target.checked } 
                    })}
                    className="rounded border-border-warm text-brand-orange-accessible focus:ring-brand-orange-accessible"
                  />
                  Student Portal Users
                </label>
                <label className="flex items-center gap-2.5 text-sm text-brand-navy">
                  <input
                    type="checkbox"
                    checked={form.audiences.agent}
                    onChange={(e) => setForm({ 
                      ...form, 
                      audiences: { ...form.audiences, agent: e.target.checked } 
                    })}
                    className="rounded border-border-warm text-brand-orange-accessible focus:ring-brand-orange-accessible"
                  />
                  Agent Partner Users
                </label>
                <label className="flex items-center gap-2.5 text-sm text-brand-navy">
                  <input
                    type="checkbox"
                    checked={form.audiences.admin}
                    onChange={(e) => setForm({ 
                      ...form, 
                      audiences: { ...form.audiences, admin: e.target.checked } 
                    })}
                    className="rounded border-border-warm text-brand-orange-accessible focus:ring-brand-orange-accessible"
                  />
                  Admissions Staff & Admins
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Detailed Message Content</label>
              <textarea 
                required
                rows={4}
                placeholder="Write the announcement description..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Announcement Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StatusType })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                <option value="approved">Approved & Active</option>
                <option value="pending">Draft Pending Review</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Publish</Button>
          </div>
        </form>
      </SlideOverPanel>
    </PageWrapper>
  )
}
