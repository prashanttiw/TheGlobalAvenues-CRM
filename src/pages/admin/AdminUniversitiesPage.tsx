import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Globe, Plus, BookOpen, Edit, Trash, Upload, LayoutGrid, List, MapPin } from 'lucide-react'
import { createAdminUniversityLive, deleteAdminUniversityLive, fetchAdminUniversitiesLive, fetchAdminUniversityCourses, updateAdminUniversityLive, uploadUniversityLogo } from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { Badge } from '../../shared/components/ui/Badge'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { SearchInput } from '../../shared/components/ui/SearchInput'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { CountrySelect } from '../../shared/components/ui/CountrySelect'
import { UniversityLogo } from '../../shared/components/catalog/UniversityLogo'
import { toast } from 'sonner'

const VIEW_MODE_KEY = 'admin_universities_view_mode'

function readStoredViewMode(): 'grid' | 'table' {
  try { return (localStorage.getItem(VIEW_MODE_KEY) as 'grid' | 'table') || 'grid' } catch { return 'grid' }
}

const EMPTY_FORM = { name: '', country: '', city: '', website_url: '', partnership_type: 'non_exclusive' }

export default function AdminUniversitiesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>(readStoredViewMode)
  const [search, setSearch] = React.useState('')
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingUniversity, setEditingUniversity] = React.useState<any | null>(null)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [uploadingLogoUid, setUploadingLogoUid] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode)
    try { localStorage.setItem(VIEW_MODE_KEY, mode) } catch {}
  }

  const universitiesQuery = useQuery({
    queryKey: ['admin', 'universities', 'cards'],
    queryFn: async () => {
      const result = await fetchAdminUniversitiesLive({ perPage: 100 })
      const universities = result.universities ?? []
      const courseCounts = await Promise.all(universities.map(async (university: any) => {
        const courses = await fetchAdminUniversityCourses(university.public_id)
        return [university.public_id, Array.isArray(courses) ? courses.length : 0] as const
      }))
      const countMap = new Map(courseCounts)
      return universities.map((university: any) => ({ ...university, courseCount: countMap.get(university.public_id) ?? 0 }))
    },
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: createAdminUniversityLive,
    onSuccess: (created: any) => {
      toast.success('University added — upload a logo and fill in the rest on its detail page.')
      setIsAddOpen(false)
      setForm(EMPTY_FORM)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'universities'] })
      if (created?.public_id) navigate(`/portal/admin/universities/${created.public_id}`)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create university.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUniversityLive,
    onSuccess: () => {
      toast.success('University deleted.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'universities'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to delete university.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ publicId, payload }: { publicId: string; payload: Record<string, any> }) => updateAdminUniversityLive(publicId, payload),
    onSuccess: () => {
      toast.success('University updated.')
      setIsAddOpen(false)
      setEditingUniversity(null)
      setForm(EMPTY_FORM)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'universities'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update university.'),
  })

  const uploadLogoMutation = useMutation({
    mutationFn: ({ publicId, file }: { publicId: string; file: File }) => uploadUniversityLogo(publicId, file),
    onSuccess: () => {
      toast.success('Logo uploaded successfully.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'universities'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to upload logo.'),
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadingLogoUid) return
    uploadLogoMutation.mutate({ publicId: uploadingLogoUid, file })
    e.target.value = '' // Reset input
  }

  const allUniversities = (universitiesQuery.data ?? []) as any[]
  const universities = React.useMemo(() => {
    if (!search.trim()) return allUniversities
    const q = search.trim().toLowerCase()
    return allUniversities.filter((u) => u.name?.toLowerCase().includes(q) || u.country?.toLowerCase().includes(q))
  }, [allUniversities, search])

  function openEdit(univ: any) {
    setEditingUniversity(univ)
    setForm({
      name: univ.name || '',
      country: univ.country || '',
      city: univ.city || '',
      website_url: univ.website_url || '',
      partnership_type: univ.partnership_type || 'non_exclusive',
    })
    setIsAddOpen(true)
  }

  function buildActions(univ: any) {
    return [
      { label: 'Edit University', icon: Edit, onClick: () => openEdit(univ) },
      { label: 'Upload Logo', icon: Upload, onClick: () => { setUploadingLogoUid(univ.public_id); fileInputRef.current?.click() } },
      { label: 'Toggle Status', onClick: () => updateMutation.mutate({ publicId: univ.public_id, payload: { status: univ.status === 'active' ? 'inactive' : 'active' } }) },
      { label: 'Delete University', icon: Trash, onClick: () => { if (window.confirm(`Delete ${univ.name}?`)) deleteMutation.mutate(univ.public_id) }, variant: 'danger' as const },
    ]
  }

  const columns: ColumnDef<any>[] = [
    {
      key: 'logo',
      header: '',
      cell: (row) => <UniversityLogo name={row.name} logoThumbUrl={row.logo_thumb_url} size="sm" />,
    },
    {
      key: 'name',
      header: 'University',
      cell: (row) => <span className="font-semibold text-brand-navy">{row.name}</span>,
    },
    {
      key: 'location',
      header: 'Location',
      cell: (row) => (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {row.city ? `${row.city}, ` : ''}{row.country}
        </span>
      ),
    },
    {
      key: 'partnership',
      header: 'Partnership',
      cell: (row) => <Badge variant={row.partnership_type === 'exclusive' ? 'secondary' : 'outline'}>{row.partnership_type === 'exclusive' ? 'Exclusive' : 'Non-exclusive'}</Badge>,
    },
    {
      key: 'courses',
      header: 'Courses',
      cell: (row) => <span className="font-semibold text-brand-navy">{row.courseCount}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <Badge variant={row.status === 'active' ? 'secondary' : 'outline'}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineActions actions={buildActions(row)} />
        </div>
      ),
    },
  ]

  return (
    <PageWrapper className="space-y-6">
      <PageHeader title="Universities" subtitle="Manage live academic institutions and partners." actions={<Button variant="primary" onClick={() => setIsAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Add University</Button>} />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-surface-card border border-border-warm rounded-xl p-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by university name or country…" className="sm:max-w-sm" />
        <div className="sm:ml-auto flex rounded-lg border border-border-warm overflow-hidden self-start">
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

      {universitiesQuery.isError ? (
        <EmptyState heading="Universities could not be loaded" description={universitiesQuery.error instanceof Error ? universitiesQuery.error.message : 'The backend request failed.'} action={<Button onClick={() => universitiesQuery.refetch()}>Retry</Button>} />
      ) : viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={universities}
          isLoading={universitiesQuery.isLoading}
          onRowClick={(row) => navigate(`/portal/admin/universities/${row.public_id}`)}
          emptyMessage="No universities match your search."
        />
      ) : universitiesQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading universities...</div>
      ) : universities.length === 0 ? (
        <EmptyState heading="No universities match your search" icon={Globe} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((univ) => (
            <Card
              key={univ.public_id}
              className="hover:shadow-card-hover transition-shadow flex flex-col justify-between cursor-pointer"
              onClick={() => navigate(`/portal/admin/universities/${univ.public_id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-3">
                  <UniversityLogo name={univ.name} logoThumbUrl={univ.logo_thumb_url} size="lg" />
                  <Badge variant={univ.status === 'active' ? 'secondary' : 'outline'}>{univ.status}</Badge>
                </div>
                <CardTitle className="text-base font-semibold text-brand-navy mt-4 leading-tight">{univ.name}</CardTitle>
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  <InlineActions actions={buildActions(univ)} />
                </div>
              </CardHeader>
              <CardContent className="mt-4 border-t border-border-warm pt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Globe className="h-3.5 w-3.5" />{univ.country}</div>
                <div className="flex items-center gap-1.5 text-xs text-brand-navy font-semibold"><BookOpen className="h-3.5 w-3.5 text-brand-orange-accessible" />{univ.courseCount} Courses</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SlideOverPanel title={editingUniversity ? "Edit University Partner" : "Add University Partner"} open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open)
        if (!open) {
          setEditingUniversity(null)
          setForm(EMPTY_FORM)
        }
      }}>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (editingUniversity) {
            updateMutation.mutate({ publicId: editingUniversity.public_id, payload: form })
          } else {
            createMutation.mutate(form)
          }
        }} className="space-y-6">
          <div className="space-y-4">
            <div><label className="text-xs font-semibold text-brand-navy block mb-1">University Name</label><input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" /></div>
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Country</label>
              <CountrySelect value={form.country} onChange={(country) => setForm({ ...form, country })} />
            </div>
            <div><label className="text-xs font-semibold text-brand-navy block mb-1">City</label><input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" /></div>
            <div><label className="text-xs font-semibold text-brand-navy block mb-1">Website</label><input type="url" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" /></div>
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Partnership Type</label>
              <select value={form.partnership_type} onChange={(e) => setForm({ ...form, partnership_type: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none">
                <option value="non_exclusive">Non-exclusive</option>
                <option value="exclusive">Exclusive</option>
              </select>
            </div>
          </div>
          <div className="pt-6 border-t border-border-warm flex justify-end gap-2"><Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button variant="primary" type="submit">{editingUniversity ? 'Save Changes' : 'Create & Add Logo'}</Button></div>
        </form>
      </SlideOverPanel>

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleLogoChange} accept="image/png, image/jpeg" />
    </PageWrapper>
  )
}
