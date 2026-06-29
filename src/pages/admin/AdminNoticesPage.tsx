import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { Plus, Trash, Edit, ExternalLink, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { usePermission } from '../../hooks/usePermission'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface Notice {
  public_id: string
  title: string
  notice_type: 'notice' | 'event'
  status: StatusType
  published_at: string | null
  expires_at: string | null
  visible_to_students: number
  visible_to_agents: number
  visible_to_admins: number
  content?: string
}

export default function AdminNoticesPage() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'notice' | 'event'>('all')
  const [isAddOpen, setIsAddOpen] = React.useState(false)

  const canCreate = usePermission('notices', 'create')
  const canEdit = usePermission('notices', 'edit')
  const canDelete = usePermission('notices', 'delete')

  const { data: noticesData, isLoading } = useQuery({
    queryKey: ['admin', 'notices'],
    queryFn: () => api.get('/admin/notices').then(r => r.data.data),
  })

  const notices: Notice[] = noticesData || []

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
  })

  const [form, setForm] = React.useState({
    title: '',
    type: 'notice' as 'notice' | 'event',
    expires_at: '',
    audiences: {
      student: true,
      agent: true,
      admin: false,
    },
    publish_now: true,
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/admin/notices', payload),
    onSuccess: (res) => {
      if (form.publish_now) {
        publishMutation.mutate(res.data.notice.public_id)
      } else {
        queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] })
        toast.success('Draft notice saved successfully!')
      }
      setIsAddOpen(false)
      setForm({
        title: '',
        type: 'notice',
        expires_at: '',
        audiences: { student: true, agent: true, admin: false },
        publish_now: true,
      })
      editor?.commands.setContent('')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create notice')
  })

  const publishMutation = useMutation({
    mutationFn: (pid: string) => api.put(`/admin/notices/${pid}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] })
      toast.success('Notice published and dispatched!')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to publish notice')
  })

  const deleteMutation = useMutation({
    mutationFn: (pid: string) => api.delete(`/admin/notices/${pid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] })
      toast.success('Notice deleted')
    },
  })

  const handleFileUpload = async (pid: string, file: File) => {
    const formData = new FormData()
    formData.append('attachment', file)
    
    try {
      await api.post(`/admin/notices/${pid}/attachment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] })
      toast.success('Attachment uploaded successfully')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload attachment')
    }
  }

  const handleAddNotice = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.audiences.student && !form.audiences.agent && !form.audiences.admin) {
      toast.error('Please select at least one target audience.')
      return
    }

    const htmlContent = editor?.getHTML()
    if (!htmlContent || htmlContent === '<p></p>') {
      toast.error('Content cannot be empty.')
      return
    }

    createMutation.mutate({
      title: form.title,
      notice_type: form.type,
      content: htmlContent,
      visible_to_students: form.audiences.student,
      visible_to_agents: form.audiences.agent,
      visible_to_admins: form.audiences.admin,
      expires_at: form.expires_at || null
    })
  }

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete notice: ${title}?`)) {
      deleteMutation.mutate(id)
    }
  }

  const filteredNotices = notices.filter(n => {
    if (typeFilter === 'all') return true
    return n.notice_type === typeFilter
  })

  const columns: ColumnDef<Notice>[] = [
    {
      key: 'notice',
      header: 'Notice',
      cell: (row) => (
        <div className="max-w-md">
          <p className="font-semibold text-brand-navy flex items-center gap-1.5">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${row.notice_type === 'event' ? 'bg-amber-500' : 'bg-brand-orange-accessible'}`} />
            {row.title}
          </p>
          {row.expires_at && (
            <p className="text-xs text-red-500 mt-0.5 font-medium">Expires: {new Date(row.expires_at).toLocaleDateString()}</p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (row) => (
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
          row.notice_type === 'event' 
            ? 'bg-amber-100 text-amber-800' 
            : 'bg-orange-100 text-orange-800'
        }`}>
          {row.notice_type}
        </span>
      ),
    },
    {
      key: 'audiences',
      header: 'Target Audiences',
      cell: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.visible_to_students === 1 && <span className="text-[10px] uppercase font-semibold text-brand-navy bg-surface-warm px-1.5 py-0.5 rounded border border-border-warm">STUDENT</span>}
          {row.visible_to_agents === 1 && <span className="text-[10px] uppercase font-semibold text-brand-navy bg-surface-warm px-1.5 py-0.5 rounded border border-border-warm">AGENT</span>}
          {row.visible_to_admins === 1 && <span className="text-[10px] uppercase font-semibold text-brand-navy bg-surface-warm px-1.5 py-0.5 rounded border border-border-warm">ADMIN</span>}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Published',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.published_at ? new Date(row.published_at).toLocaleDateString() : 'Draft'}</span>,
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
                label: 'Publish', 
                icon: ExternalLink, 
                onClick: () => publishMutation.mutate(row.public_id),
                hidden: !canEdit || row.status === 'published' 
              },
              {
                label: 'Upload Attachment',
                icon: Paperclip,
                onClick: () => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) handleFileUpload(row.public_id, file)
                  }
                  input.click()
                },
                hidden: !canEdit
              },
              { 
                label: 'Delete Notice', 
                icon: Trash, 
                onClick: () => handleDelete(row.public_id, row.title), 
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="text-xs font-semibold text-brand-navy block mb-1">Expiry Date (Optional)</label>
                <input 
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
                />
              </div>
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
              <label className="text-xs font-semibold text-brand-navy block mb-1">Message Content</label>
              <div className="border border-border-warm rounded-md bg-white p-2 min-h-[150px] prose prose-sm max-w-none focus-within:ring-1 focus-within:ring-brand-orange-accessible">
                <EditorContent editor={editor} className="outline-none min-h-[130px]" />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2.5 text-sm text-brand-navy font-medium p-2 bg-surface-warm rounded-md border border-border-warm">
                <input
                  type="checkbox"
                  checked={form.publish_now}
                  onChange={(e) => setForm({ ...form, publish_now: e.target.checked })}
                  className="rounded border-border-warm text-brand-orange-accessible focus:ring-brand-orange-accessible"
                />
                Publish and notify immediately
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending || publishMutation.isPending}>
              {form.publish_now ? 'Publish Now' : 'Save Draft'}
            </Button>
          </div>
        </form>
      </SlideOverPanel>
    </PageWrapper>
  )
}
