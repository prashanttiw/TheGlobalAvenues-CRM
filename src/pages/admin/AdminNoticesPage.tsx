import * as React from 'react'
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bell, ChevronLeft, ChevronRight, Edit, ExternalLink, FileText, LayoutGrid, List, Paperclip, Plus, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import api, { fetchAdminNoticesFeed } from '../../lib/api'
import { usePermission } from '../../hooks/usePermission'
import { NoticesFeedView } from '../../shared/components/ui/NoticesFeedView'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent } from '../../shared/components/ui/Card'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { SearchInput } from '../../shared/components/ui/SearchInput'
import { useUrlFilters, useDebouncedFilterSync } from '../../shared/hooks/useUrlFilters'
import { ClearFiltersButton } from '../../shared/components/ui/ClearFiltersButton'

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
  event_date?: string | null
  event_location?: string | null
  attachment_public_id?: string | null
  attachment_filename?: string | null
}

interface ListMeta {
  current_page: number
  per_page: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

const PER_PAGE = 20

const defaultForm = {
  title: '',
  type: 'notice' as 'notice' | 'event',
  expires_at: '',
  event_date: '',
  event_location: '',
  audiences: { student: true, agent: true, admin: false },
  publish_now: true,
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const VIEW_MODE_KEY = 'admin_notices_view_mode'

function readStoredViewMode(): 'grid' | 'table' {
  try { return (localStorage.getItem(VIEW_MODE_KEY) as 'grid' | 'table') || 'grid' } catch { return 'grid' }
}

// ── Non-creator admin: read-only feed with toggle ────────────────────────────
function AdminNoticesFeed() {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useUrlFilters({
    type: 'all', sort: 'desc', page: '1',
  })
  const filter = filters.type as 'all' | 'notice' | 'event'
  const sortDir = filters.sort as 'desc' | 'asc'
  const page = Number(filters.page) || 1
  const setFilter = (v: 'all' | 'notice' | 'event') => setFilters({ type: v, page: '1' })
  const setSortDir = (v: 'desc' | 'asc') => setFilters({ sort: v, page: '1' })
  const setPage = (updater: number | ((p: number) => number)) => {
    const next = typeof updater === 'function' ? (updater as (p: number) => number)(page) : updater
    setFilters({ page: String(next) })
  }
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>(readStoredViewMode)

  const handleViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode)
    try { localStorage.setItem(VIEW_MODE_KEY, mode) } catch {}
  }

  const feedQuery = useQuery({
    queryKey: ['admin', 'notices', 'feed', { filter, sortDir, page }],
    queryFn: () =>
      fetchAdminNoticesFeed({
        page,
        per_page: 20,
        sort: sortDir,
        ...(filter !== 'all' ? { notice_type: filter } : {}),
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  const notices = feedQuery.data?.notices ?? []
  const meta = feedQuery.data?.meta as any
  const totalPages = meta?.total_pages ?? 1

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Notices & Events"
        subtitle="Published notices and events visible to admin staff."
      />

      <div className="flex flex-wrap items-center gap-3 bg-surface-card border border-border-warm rounded-xl p-3">
        <div className="flex gap-1.5">
          {(['all', 'notice', 'event'] as const).map((val) => (
            <Button key={val} variant={filter === val ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter(val)}>
              {val === 'all' ? 'All' : val === 'notice' ? 'Notices' : 'Events'}
            </Button>
          ))}
        </div>
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
          className="px-3 py-1.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
        >
          <option value="desc">Latest First</option>
          <option value="asc">Oldest First</option>
        </select>
        {hasActiveFilters && <ClearFiltersButton className="" onClick={clearFilters} />}
        {meta?.total > 0 && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {meta.total} total · page {meta.current_page}/{totalPages}
          </span>
        )}
        <div className="ml-auto flex rounded-lg border border-border-warm overflow-hidden">
          <button
            type="button"
            onClick={() => handleViewMode('grid')}
            title="Grid view"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-brand-orange-accessible text-white' : 'bg-surface-warm text-muted-foreground hover:text-brand-navy'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            onClick={() => handleViewMode('table')}
            title="Table view"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-border-warm transition-colors ${
              viewMode === 'table' ? 'bg-brand-orange-accessible text-white' : 'bg-surface-warm text-muted-foreground hover:text-brand-navy'
            }`}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {feedQuery.isError ? (
        <EmptyState
          icon={AlertTriangle}
          heading="Notices could not be loaded"
          description={feedQuery.error instanceof Error ? feedQuery.error.message : 'Backend request failed.'}
          action={<Button onClick={() => feedQuery.refetch()}>Retry</Button>}
        />
      ) : notices.length === 0 && !feedQuery.isLoading ? (
        <Card className="border-dashed border-border-warm py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Bell className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-brand-navy">No notices yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">No published notices are visible to admin staff right now.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <NoticesFeedView
            notices={notices}
            isLoading={feedQuery.isLoading && !feedQuery.data}
            viewMode={viewMode}
            apiBase={API_BASE}
          />
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-warm pt-4">
              <p className="text-xs text-muted-foreground">
                Showing {notices.length} of {meta?.total ?? 0} notices
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!meta?.has_prev || feedQuery.isFetching}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Previous
                </Button>
                <span className="text-xs font-semibold text-brand-navy px-2">{meta?.current_page ?? page} / {totalPages}</span>
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!meta?.has_next || feedQuery.isFetching}>
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  )
}

// ── Main component — branches on canCreate ────────────────────────────────────
export default function AdminNoticesPage() {
  const queryClient = useQueryClient()

  const canCreate = usePermission('notices', 'create')
  const canEdit = usePermission('notices', 'edit')
  const canDelete = usePermission('notices', 'delete')

  // Non-creator admins: show read-only feed with toggle
  if (!canCreate && !canEdit && !canDelete) {
    return <AdminNoticesFeed />
  }

  const { filters, setFilters, clearFilters, hasActiveFilters } = useUrlFilters({
    page: '1', type: 'all', sort: 'desc', search: '',
  })
  const page = Number(filters.page) || 1
  const typeFilter = filters.type as 'all' | 'notice' | 'event'
  const sortDir = filters.sort as 'desc' | 'asc'
  const setPage = (updater: number | ((p: number) => number)) => {
    const next = typeof updater === 'function' ? (updater as (p: number) => number)(page) : updater
    setFilters({ page: String(next) })
  }
  const setTypeFilter = (v: 'all' | 'notice' | 'event') => setFilters({ type: v, page: '1' })
  const setSortDir = (v: 'desc' | 'asc') => setFilters({ sort: v, page: '1' })

  const [isPanelOpen, setIsPanelOpen] = React.useState(false)
  const [panelMode, setPanelMode] = React.useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState(defaultForm)
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [search, setSearch] = React.useState(filters.search)
  const debouncedSearch = filters.search
  useDebouncedFilterSync(search, (v) => setFilters({ search: v, page: '1' }))

  const handleClearFilters = () => {
    clearFilters()
    setSearch('')
  }

  const { data: listResponse, isLoading, isFetching } = useQuery<{ data: Notice[]; meta: ListMeta }>({
    queryKey: ['admin', 'notices', { page, sortDir, typeFilter, debouncedSearch }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
        sort: sortDir,
      })
      if (typeFilter !== 'all') params.set('notice_type', typeFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      return api.get(`/admin/notices?${params}`).then(r => r.data)
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const notices: Notice[] = listResponse?.data ?? []
  const meta: ListMeta | undefined = listResponse?.meta

  const { data: editNoticeData, isLoading: isEditLoading } = useQuery<Notice>({
    queryKey: ['admin', 'notice', editingId],
    queryFn: () => api.get(`/admin/notices/${editingId}`).then(r => r.data.notice),
    enabled: !!editingId && panelMode === 'edit',
    staleTime: 0,
  })

  const createEditor = useEditor({ extensions: [StarterKit], content: '' })
  const editEditor = useEditor({ extensions: [StarterKit], content: '' })

  React.useEffect(() => {
    if (!editNoticeData || panelMode !== 'edit') return
    setForm({
      title: editNoticeData.title ?? '',
      type: editNoticeData.notice_type ?? 'notice',
      expires_at: editNoticeData.expires_at ? editNoticeData.expires_at.split('T')[0] : '',
      event_date: editNoticeData.event_date ?? '',
      event_location: editNoticeData.event_location ?? '',
      audiences: {
        student: Number(editNoticeData.visible_to_students) === 1,
        agent: Number(editNoticeData.visible_to_agents) === 1,
        admin: Number(editNoticeData.visible_to_admins) === 1,
      },
      publish_now: false,
    })
    editEditor?.commands.setContent(editNoticeData.content ?? '')
  }, [editNoticeData, panelMode, editEditor])

  const handleFileUpload = async (pid: string, file: File): Promise<void> => {
    const formData = new FormData()
    formData.append('attachment', file)
    await api.post(`/admin/notices/${pid}/attachment`, formData)
  }

  const closePanel = () => {
    setIsPanelOpen(false)
    setEditingId(null)
    setForm(defaultForm)
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openCreate = () => {
    setPanelMode('create')
    setEditingId(null)
    setForm(defaultForm)
    setPendingFile(null)
    createEditor?.commands.setContent('')
    setIsPanelOpen(true)
  }

  const openEdit = (notice: Notice) => {
    setPanelMode('edit')
    setEditingId(notice.public_id)
    setForm(defaultForm)
    setPendingFile(null)
    setIsPanelOpen(true)
  }

  const publishMutation = useMutation({
    mutationFn: (pid: string) => api.put(`/admin/notices/${pid}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] })
      toast.success('Notice published and dispatched!')
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to publish notice'),
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/admin/notices', payload),
    onSuccess: async (res) => {
      const pid: string = res.data.notice.public_id
      if (pendingFile) {
        try {
          await handleFileUpload(pid, pendingFile)
          toast.success('Attachment uploaded')
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'Notice created but attachment upload failed')
        }
      }
      if (form.publish_now) {
        publishMutation.mutate(pid)
      } else {
        queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] })
        toast.success('Draft saved successfully!')
      }
      closePanel()
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create notice'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ pid, payload }: { pid: string; payload: any }) =>
      api.put(`/admin/notices/${pid}`, payload),
    onSuccess: async () => {
      if (pendingFile && editingId) {
        try {
          await handleFileUpload(editingId, pendingFile)
          toast.success('Attachment updated')
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'Attachment upload failed')
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'notice', editingId] })
      toast.success('Notice updated!')
      closePanel()
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update notice'),
  })

  const deleteMutation = useMutation({
    mutationFn: (pid: string) => api.delete(`/admin/notices/${pid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] })
      toast.success('Notice deleted')
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete notice'),
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.audiences.student && !form.audiences.agent && !form.audiences.admin) {
      toast.error('Select at least one target audience.')
      return
    }
    const html = createEditor?.getHTML()
    if (!html || html === '<p></p>') {
      toast.error('Content cannot be empty.')
      return
    }
    createMutation.mutate({
      title: form.title,
      notice_type: form.type,
      content: html,
      visible_to_students: form.audiences.student,
      visible_to_agents: form.audiences.agent,
      visible_to_admins: form.audiences.admin,
      expires_at: form.expires_at || null,
      event_date: form.type === 'event' ? form.event_date || null : null,
      event_location: form.type === 'event' ? form.event_location || null : null,
    })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    if (!form.audiences.student && !form.audiences.agent && !form.audiences.admin) {
      toast.error('Select at least one target audience.')
      return
    }
    const html = editEditor?.getHTML()
    if (!html || html === '<p></p>') {
      toast.error('Content cannot be empty.')
      return
    }
    updateMutation.mutate({
      pid: editingId,
      payload: {
        title: form.title,
        notice_type: form.type,
        content: html,
        visible_to_students: form.audiences.student,
        visible_to_agents: form.audiences.agent,
        visible_to_admins: form.audiences.admin,
        expires_at: form.expires_at || null,
        event_date: form.type === 'event' ? form.event_date || null : null,
        event_location: form.type === 'event' ? form.event_location || null : null,
      },
    })
  }

  const handleDelete = (pid: string, title: string) => {
    if (confirm(`Delete "${title}"?`)) {
      deleteMutation.mutate(pid)
    }
  }

  const totalPages = meta?.total_pages ?? 1
  const pageButtons = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  const columns: ColumnDef<Notice>[] = [
    {
      key: 'notice',
      header: 'Notice / Event',
      cell: (row) => (
        <div className="max-w-md">
          <p className="font-semibold text-brand-navy flex items-center gap-1.5">
            <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${row.notice_type === 'event' ? 'bg-amber-500' : 'bg-brand-orange-accessible'}`} />
            {row.title}
          </p>
          {row.expires_at && (
            <p className="text-xs text-red-500 mt-0.5 font-medium">
              Expires: {new Date(row.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (row) => (
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
          row.notice_type === 'event' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'
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
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.published_at ? new Date(row.published_at).toLocaleDateString() : 'Draft'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'attachment',
      header: 'Attachment',
      cell: (row) => {
        if (!row.attachment_public_id) {
          return <span className="text-xs text-muted-foreground">—</span>
        }
        const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
        const url = `${apiBase}/?route=files&action=${row.attachment_public_id}/download`
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-orange-accessible hover:underline"
            title={row.attachment_filename ?? 'Download'}
            onClick={(e) => e.stopPropagation()}
          >
            <FileText className="h-3.5 w-3.5" />
            View
          </a>
        )
      },
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
                hidden: !canEdit || row.status === 'published',
              },
              {
                label: 'Edit',
                icon: Edit,
                onClick: () => openEdit(row),
                hidden: !canEdit,
              },
              {
                label: 'Delete',
                icon: Trash,
                onClick: () => handleDelete(row.public_id, row.title),
                variant: 'danger',
                hidden: !canDelete,
              },
            ]}
          />
        </div>
      ),
    },
  ]

  const renderFormFields = (
    editor: ReturnType<typeof useEditor>,
    isEdit: boolean,
    existingAttachment?: { public_id: string; filename: string } | null,
  ) => (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-brand-navy block mb-1">Title</label>
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
          <label className="text-xs font-semibold text-brand-navy block mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as 'notice' | 'event' })}
            className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          >
            <option value="notice">Notice</option>
            <option value="event">Event</option>
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

      {form.type === 'event' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-brand-navy block mb-1">Event Date & Time</label>
            <input
              type="datetime-local"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-navy block mb-1">Event Location</label>
            <input
              type="text"
              value={form.event_location}
              placeholder="e.g. New Delhi Office"
              onChange={(e) => setForm({ ...form, event_location: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-brand-navy block mb-1">Target Audiences</label>
        <div className="space-y-2 bg-surface-warm p-3 rounded-lg border border-border-warm">
          {([
            { key: 'student', label: 'Student Portal Users' },
            { key: 'agent', label: 'Agent Partner Users' },
            { key: 'admin', label: 'Admissions Staff & Admins' },
          ] as const).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2.5 text-sm text-brand-navy cursor-pointer">
              <input
                type="checkbox"
                checked={form.audiences[key]}
                onChange={(e) => setForm({ ...form, audiences: { ...form.audiences, [key]: e.target.checked } })}
                className="rounded border-border-warm text-brand-orange-accessible focus:ring-brand-orange-accessible"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-brand-navy block mb-1">Content</label>
        <div className="border border-border-warm rounded-md bg-white p-2 min-h-[150px] prose prose-sm max-w-none focus-within:ring-1 focus-within:ring-brand-orange-accessible">
          <EditorContent editor={editor} className="outline-none min-h-[130px]" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-brand-navy block mb-1">Attachment (Optional)</label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.pdf"
            className="hidden"
            onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-3.5 w-3.5 mr-1.5" />
            {existingAttachment && !pendingFile ? 'Replace File' : 'Choose File'}
          </Button>
          {pendingFile && (
            <button
              type="button"
              onClick={() => {
                setPendingFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </div>

        {pendingFile ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 rounded-md px-2.5 py-1.5">
            <FileText className="h-3.5 w-3.5 text-brand-orange-accessible shrink-0" />
            <span className="font-medium text-brand-navy truncate max-w-[260px]">{pendingFile.name}</span>
            <span className="text-muted-foreground shrink-0">— will be uploaded on save</span>
          </div>
        ) : existingAttachment ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs bg-surface-warm border border-border-warm rounded-md px-2.5 py-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <a
              href={`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}/?route=files&action=${existingAttachment.public_id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-orange-accessible hover:underline truncate max-w-[260px]"
              title="View current attachment"
            >
              {existingAttachment.filename}
            </a>
            <span className="text-muted-foreground shrink-0">— current</span>
          </div>
        ) : null}

        <p className="text-[10px] text-muted-foreground mt-1.5">JPG, PNG, or PDF</p>
      </div>

      {!isEdit && (
        <label className="flex items-center gap-2.5 text-sm text-brand-navy font-medium p-2 bg-surface-warm rounded-md border border-border-warm cursor-pointer">
          <input
            type="checkbox"
            checked={form.publish_now}
            onChange={(e) => setForm({ ...form, publish_now: e.target.checked })}
            className="rounded border-border-warm text-brand-orange-accessible focus:ring-brand-orange-accessible"
          />
          Publish and notify immediately
        </label>
      )}
    </div>
  )

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Notices & Events"
        subtitle="Publish bulletins and scheduling events for students, agents, and staff."
        actions={
          canCreate ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Notice / Event
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 bg-surface-card p-4 rounded-xl border border-border-warm items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          isLoading={isFetching}
          placeholder="Search by title or content…"
          className="sm:max-w-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="w-full sm:w-48 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          aria-label="Filter by type"
        >
          <option value="all">All Types</option>
          <option value="notice">Notices Only</option>
          <option value="event">Events Only</option>
        </select>
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
          className="w-full sm:w-48 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          aria-label="Sort order"
        >
          <option value="desc">Latest First</option>
          <option value="asc">Oldest First</option>
        </select>
        {hasActiveFilters && <ClearFiltersButton className="" onClick={handleClearFilters} />}
        {meta && (
          <span className="ml-auto text-xs text-muted-foreground">
            {meta.total} total · page {meta.current_page} of {meta.total_pages}
          </span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={notices}
        isLoading={isLoading}
        emptyMessage="No notices match the selected criteria."
      />

      {meta && meta.total_pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-warm pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {notices.length} of {meta.total} — page {meta.current_page} of {meta.total_pages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!meta.has_prev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageButtons().map((btn, i) =>
              btn === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
              ) : (
                <Button
                  key={btn}
                  variant={btn === page ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPage(btn as number)}
                  className="min-w-[2rem]"
                >
                  {btn}
                </Button>
              )
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!meta.has_next}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <SlideOverPanel
        title={panelMode === 'create' ? 'New Notice / Event' : 'Edit Notice / Event'}
        open={isPanelOpen}
        onOpenChange={(open) => { if (!open) closePanel() }}
      >
        {panelMode === 'create' ? (
          <form onSubmit={handleCreateSubmit} className="space-y-6">
            {renderFormFields(createEditor, false, null)}
            <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={closePanel}>Cancel</Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={createMutation.isPending || publishMutation.isPending}
              >
                {form.publish_now ? 'Publish Now' : 'Save Draft'}
              </Button>
            </div>
          </form>
        ) : (
          <>
            {isEditLoading && !editNoticeData ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-brand-orange-accessible border-t-transparent rounded-full" />
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} className="space-y-6">
                {renderFormFields(
                  editEditor,
                  true,
                  editNoticeData?.attachment_public_id
                    ? { public_id: editNoticeData.attachment_public_id, filename: editNoticeData.attachment_filename ?? 'attachment' }
                    : null,
                )}
                <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
                  <Button variant="secondary" type="button" onClick={closePanel}>Cancel</Button>
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={updateMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </SlideOverPanel>
    </PageWrapper>
  )
}
