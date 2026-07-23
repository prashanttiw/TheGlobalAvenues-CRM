import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Ban,
  Check,
  GitFork,
  Inbox,
  Plus,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import {
  approveAdminAgent,
  createAdminAgent,
  fetchAdminAgentDetail,
  fetchAdminAgents,
  fetchAdminAgentsDrafts,
  fetchAdminAgentsPending,
  fetchAdminAgentsRegistered,
  fetchAdminAgentTree,
  openAgentDocument,
  rejectAdminAgent,
  suspendAdminAgent,
  type AdminAgentDetail,
} from '../../lib/api'
import { usePermission } from '../../hooks/usePermission'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { SearchInput } from '../../shared/components/ui/SearchInput'
import { Dialog, DialogContent, DialogTitle } from '../../shared/components/ui/Dialog'
import {
  SlideOver,
  SlideOverContent,
  SlideOverHeader,
  SlideOverBody,
  SlideOverFooter,
  SlideOverTitle,
} from '../../shared/components/ui/SlideOverPanel'
import { UserAvatar } from '../../shared/components/ui/Avatar'
import { AgentTreeNode, type AgentNode } from '../../components/agent/AgentTreeNode'
import { useUrlFilters, useDebouncedFilterSync } from '../../shared/hooks/useUrlFilters'
import { ClearFiltersButton } from '../../shared/components/ui/ClearFiltersButton'

const SECTIONS = [
  { key: 'registered', label: 'Registered' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'pending', label: 'Submitted' },
  { key: 'all', label: 'All Agents' },
  { key: 'hierarchy', label: 'Hierarchy' },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

function tierLabel(tier: number) {
  if (tier === 1) return 'Level 1 Agent'
  if (tier === 2) return 'Sub-Agent'
  if (tier === 3) return 'Sub-Sub-Agent'
  return `Tier ${tier}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

const DOC_LABELS: Record<string, string> = {
  profile_photo: 'Profile Photo',
  aadhar_card: 'Aadhar Card',
  cv_resume: 'CV / Resume',
}

// ─── Create Agent Panel (admin-created agent, skips documents/review) ─────────

const defaultCreateAgentForm = {
  firstName: '',
  lastName: '',
  agencyName: '',
  email: '',
  mobileNumber: '',
  country: '',
  addressLine: '',
  city: '',
  state: '',
  businessRegNumber: '',
  alternateMobileNumber: '',
  partnershipScope: '',
}

function CreateAgentPanel({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [form, setForm] = React.useState(defaultCreateAgentForm)
  const set = (patch: Partial<typeof defaultCreateAgentForm>) => setForm((prev) => ({ ...prev, ...patch }))

  const mutation = useMutation({
    mutationFn: () =>
      createAdminAgent({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        agency_name: form.agencyName.trim(),
        email: form.email.trim(),
        mobile_number: form.mobileNumber.trim(),
        country: form.country.trim(),
        address_line: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        business_reg_number: form.businessRegNumber.trim() || undefined,
        alternate_mobile_number: form.alternateMobileNumber.trim() || undefined,
        partnership_scope: form.partnershipScope.trim() || undefined,
      }),
    onSuccess: (result) => {
      toast.success(`Agent created — referral code ${result.referral_code}. Welcome email sent.`)
      setForm(defaultCreateAgentForm)
      onOpenChange(false)
      onSuccess()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create agent.'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  const inputCls =
    'w-full rounded-lg border border-border-warm bg-surface-warm px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-muted-foreground focus:border-brand-orange-accessible focus:outline-none focus:ring-1 focus:ring-brand-orange-accessible/30 transition'
  const labelCls = 'mb-1 block text-xs font-semibold text-brand-navy'
  const required = <span className="text-red-500">*</span>

  return (
    <SlideOver open={open} onOpenChange={onOpenChange}>
      <SlideOverContent>
        <SlideOverHeader>
          <SlideOverTitle>Add Agent</SlideOverTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Creates a fully-approved partner account immediately — no documents or review needed.
            A welcome email with a temporary password will be sent.
          </p>
        </SlideOverHeader>

        <SlideOverBody>
          <form id="create-agent-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First Name {required}</label>
                <input className={inputCls} value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Last Name {required}</label>
                <input className={inputCls} value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Agency Name {required}</label>
              <input className={inputCls} value={form.agencyName} onChange={(e) => set({ agencyName: e.target.value })} required />
            </div>

            <div>
              <label className={labelCls}>Email Address {required}</label>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => set({ email: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Mobile Number {required}</label>
                <input type="tel" className={inputCls} value={form.mobileNumber} onChange={(e) => set({ mobileNumber: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Alternate Mobile <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input type="tel" className={inputCls} value={form.alternateMobileNumber} onChange={(e) => set({ alternateMobileNumber: e.target.value })} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Country {required}</label>
              <input className={inputCls} value={form.country} onChange={(e) => set({ country: e.target.value })} required />
            </div>

            <div>
              <label className={labelCls}>Address {required}</label>
              <input className={inputCls} value={form.addressLine} onChange={(e) => set({ addressLine: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>City {required}</label>
                <input className={inputCls} value={form.city} onChange={(e) => set({ city: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>State {required}</label>
                <input className={inputCls} value={form.state} onChange={(e) => set({ state: e.target.value })} required />
              </div>
            </div>

            <div className="border-t border-border-warm pt-4 space-y-4">
              <div>
                <label className={labelCls}>Business Registration Number <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input className={inputCls} value={form.businessRegNumber} onChange={(e) => set({ businessRegNumber: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Partnership Scope <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea
                  className={inputCls + ' min-h-[70px] resize-none'}
                  value={form.partnershipScope}
                  onChange={(e) => set({ partnershipScope: e.target.value })}
                />
              </div>
            </div>
          </form>
        </SlideOverBody>

        <SlideOverFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" type="submit" form="create-agent-form" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Agent'}
          </Button>
        </SlideOverFooter>
      </SlideOverContent>
    </SlideOver>
  )
}

export default function AdminAgentsPage() {
  const queryClient = useQueryClient()
  const { filters, setFilter, setFilters } = useUrlFilters({
    section: 'pending', status: '', tier: '', search: '',
  })
  const section = filters.section as SectionKey
  const setSection = (v: SectionKey) => setFilter('section', v)
  const statusFilter = filters.status
  const tierFilter = filters.tier
  const setStatusFilter = (v: string) => setFilter('status', v)
  const setTierFilter = (v: string) => setFilter('tier', v)

  const [search, setSearch] = React.useState(filters.search)
  const debouncedSearch = filters.search
  useDebouncedFilterSync(search, (v) => setFilter('search', v))

  // Only the "All Agents" table's own filters count here — `section` (which tab) isn't a filter
  // to clear, and this button only ever renders inside the `section === 'all'` block anyway.
  const hasActiveFilters = Boolean(statusFilter || tierFilter || search)
  const handleClearFilters = () => {
    setFilters({ status: '', tier: '', search: '' })
    setSearch('')
  }

  const [reviewPid, setReviewPid] = React.useState<string | null>(null)
  const [rejectReason, setRejectReason] = React.useState('')
  const [hierarchyRootPid, setHierarchyRootPid] = React.useState<string>('')
  const [createOpen, setCreateOpen] = React.useState(false)

  const canApprove = usePermission('agents', 'approve')
  const canSuspend = usePermission('agents', 'delete')
  const canCreate = usePermission('agents', 'create')

  const invalidateAll = () =>
    queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'admin-agents' })

  // ── Section queries ──────────────────────────────────────────────────
  const registeredQuery = useQuery({
    queryKey: ['admin-agents', 'registered'],
    queryFn: fetchAdminAgentsRegistered,
    enabled: section === 'registered',
    staleTime: 30_000,
  })

  const draftsQuery = useQuery({
    queryKey: ['admin-agents', 'drafts'],
    queryFn: fetchAdminAgentsDrafts,
    enabled: section === 'drafts',
    staleTime: 30_000,
  })

  const pendingQuery = useQuery({
    queryKey: ['admin-agents', 'pending'],
    queryFn: fetchAdminAgentsPending,
    enabled: section === 'pending',
    staleTime: 15_000,
  })

  const allQuery = useQuery({
    queryKey: ['admin-agents', 'all', { statusFilter, tierFilter, debouncedSearch }],
    queryFn: () =>
      fetchAdminAgents({
        perPage: 100,
        status: statusFilter || undefined,
        tier: tierFilter || undefined,
        q: debouncedSearch || undefined,
      }),
    enabled: section === 'all',
    staleTime: 30_000,
  })

  const rootAgentsQuery = useQuery({
    queryKey: ['admin-agents', 'roots'],
    queryFn: () => fetchAdminAgents({ status: 'approved', tier: '1', perPage: 200 }),
    enabled: section === 'hierarchy',
    staleTime: 60_000,
  })

  const treeQuery = useQuery({
    queryKey: ['admin-agents', 'tree', hierarchyRootPid],
    queryFn: () => fetchAdminAgentTree(hierarchyRootPid),
    enabled: section === 'hierarchy' && !!hierarchyRootPid,
    staleTime: 15_000,
  })

  const detailQuery = useQuery({
    queryKey: ['admin-agents', 'detail', reviewPid],
    queryFn: () => fetchAdminAgentDetail(reviewPid as string),
    enabled: !!reviewPid,
  })

  // ── Mutations ────────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: (publicId: string) => approveAdminAgent(publicId),
    onSuccess: () => {
      toast.success('Agent approved.')
      setReviewPid(null)
      void invalidateAll()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to approve agent.'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ publicId, reason }: { publicId: string; reason: string }) => rejectAdminAgent(publicId, reason),
    onSuccess: () => {
      toast.success('Agent rejected.')
      setReviewPid(null)
      setRejectReason('')
      void invalidateAll()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to reject agent.'),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ publicId, reason }: { publicId: string; reason: string }) => suspendAdminAgent(publicId, reason),
    onSuccess: () => {
      toast.success('Agent suspended.')
      void invalidateAll()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to suspend agent.'),
  })

  const openDoc = async (filePid: string) => {
    try {
      await openAgentDocument(filePid)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open document.')
    }
  }

  // ── Columns ──────────────────────────────────────────────────────────
  const registeredColumns: ColumnDef<any>[] = [
    { key: 'name', header: 'Name', cell: (row) => <span className="font-semibold text-brand-navy">{row.full_name || '—'}</span> },
    { key: 'tier', header: 'Tier', cell: (row) => tierLabel(Number(row.tier)) },
    { key: 'email', header: 'Email', cell: (row) => row.email || '—' },
    { key: 'mobile', header: 'Mobile', cell: (row) => row.mobile_number || '—' },
    { key: 'joined', header: 'Registered', cell: (row) => formatDate(row.created_at) },
  ]

  const draftColumns: ColumnDef<any>[] = [
    { key: 'name', header: 'Name', cell: (row) => <span className="font-semibold text-brand-navy">{row.full_name || '—'}</span> },
    { key: 'tier', header: 'Tier', cell: (row) => tierLabel(Number(row.tier)) },
    { key: 'location', header: 'Location', cell: (row) => [row.city, row.state].filter(Boolean).join(', ') || '—' },
    { key: 'email', header: 'Email', cell: (row) => row.email || '—' },
    { key: 'updated', header: 'Last Edited', cell: (row) => formatDate(row.draft_updated_at) },
  ]

  const pendingColumns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Applicant',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.full_name}</p>
          <p className="text-xs text-muted-foreground">ID: {row.public_id}</p>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Category',
      cell: (row) => (
        <div>
          <span className="text-[10px] uppercase font-bold text-brand-orange-accessible bg-brand-orange-accessible/10 px-2 py-0.5 rounded">
            {tierLabel(Number(row.tier))}
          </span>
          {row.parent_agent_name && (
            <p className="text-xs text-muted-foreground mt-1">under {row.parent_agent_name}</p>
          )}
        </div>
      ),
    },
    { key: 'location', header: 'Location', cell: (row) => [row.city, row.state].filter(Boolean).join(', ') || '—' },
    {
      key: 'docs',
      header: 'Documents',
      cell: (row) => `${(row.uploaded_doc_types ?? []).length} / 3`,
    },
    { key: 'submitted', header: 'Submitted', cell: (row) => formatDate(row.application_submitted_at || row.created_at) },
    {
      key: 'actions',
      header: 'Review',
      cell: (row) => (
        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setReviewPid(row.public_id) }}>
          Review
        </Button>
      ),
    },
  ]

  const allColumns: ColumnDef<any>[] = [
    {
      key: 'agency',
      header: 'Agency',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={row.full_name || row.agency_name || '?'} image={row.avatar_thumb_url ?? undefined} size="sm" />
          <div>
            <p className="font-semibold text-brand-navy">{row.agency_name || row.full_name}</p>
            <p className="text-xs text-muted-foreground">ID: {row.public_id} | {row.email || 'Email unavailable'}</p>
            {row.created_by_admin_name && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                <ShieldCheck className="h-3 w-3" />
                Added by {row.created_by_admin_name}
              </p>
            )}
          </div>
        </div>
      ),
    },
    { key: 'contact', header: 'Contact Person', cell: (row) => <span className="text-brand-navy">{row.full_name}</span> },
    {
      key: 'tier',
      header: 'Tier',
      cell: (row) => (
        <div>
          <span className="text-[10px] uppercase font-bold text-brand-orange-accessible bg-brand-orange-accessible/10 px-2 py-0.5 rounded">
            {tierLabel(Number(row.tier))}
          </span>
          {row.parent_full_name && <p className="text-xs text-muted-foreground mt-1">under {row.parent_full_name}</p>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status as StatusType} /> },
    { key: 'joined', header: 'Joined', cell: (row) => formatDate(row.created_at) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineActions
            actions={[
              {
                label: 'Review',
                icon: Inbox,
                onClick: () => setReviewPid(row.public_id),
              },
              {
                label: 'Suspend Partner',
                icon: Ban,
                onClick: () => {
                  const reason = window.prompt('Enter suspension reason')
                  if (!reason?.trim()) return
                  suspendMutation.mutate({ publicId: row.public_id, reason: reason.trim() })
                },
                variant: 'danger',
                hidden: !canSuspend || row.status !== 'approved',
              },
            ]}
          />
        </div>
      ),
    },
  ]

  const roots: any[] = rootAgentsQuery.data?.agents ?? []

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Agents"
        subtitle="Registration, onboarding, approvals, and hierarchy — all in one place."
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Agent
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-1 bg-surface-card border border-border-warm rounded-xl p-1 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              section === s.key ? 'bg-brand-navy text-white' : 'text-muted-foreground hover:bg-surface-warm'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'registered' && (
        <DataTable
          columns={registeredColumns}
          data={registeredQuery.data?.agents ?? []}
          isLoading={registeredQuery.isLoading}
          emptyMessage="No one has registered without starting an application yet."
        />
      )}

      {section === 'drafts' && (
        <DataTable
          columns={draftColumns}
          data={draftsQuery.data?.agents ?? []}
          isLoading={draftsQuery.isLoading}
          emptyMessage="No applications in progress right now."
        />
      )}

      {section === 'pending' && (
        <DataTable
          columns={pendingColumns}
          data={pendingQuery.data?.agents ?? []}
          isLoading={pendingQuery.isLoading}
          onRowClick={(row: any) => setReviewPid(row.public_id)}
          emptyMessage="No applications waiting for review."
        />
      )}

      {section === 'all' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 bg-surface-card p-4 rounded-xl border border-border-warm">
            <SearchInput
              value={search}
              onChange={setSearch}
              isLoading={allQuery.isFetching}
              placeholder="Search by agency, contact name, or referral code…"
              className="sm:max-w-sm"
            />
            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="registered">Registered</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="w-full sm:w-40 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                <option value="">All Tiers</option>
                <option value="1">Level 1 Agent</option>
                <option value="2">Sub-Agent</option>
                <option value="3">Sub-Sub-Agent</option>
              </select>
              {hasActiveFilters && <ClearFiltersButton className="" onClick={handleClearFilters} />}
            </div>
          </div>

          {allQuery.isError ? (
            <EmptyState
              icon={Ban}
              heading="Agents could not be loaded"
              description={allQuery.error instanceof Error ? allQuery.error.message : 'The backend request failed.'}
              action={<Button onClick={() => allQuery.refetch()}>Retry</Button>}
            />
          ) : (
            <DataTable
              columns={allColumns}
              data={allQuery.data?.agents ?? []}
              isLoading={allQuery.isLoading}
              onRowClick={(row: any) => setReviewPid(row.public_id)}
              emptyMessage="No agent partners match the current criteria."
            />
          )}
        </div>
      )}

      {section === 'hierarchy' && (
        <div className="space-y-4">
          <div className="bg-surface-card p-4 rounded-xl border border-border-warm flex items-center gap-3">
            <GitFork className="h-4 w-4 text-brand-navy shrink-0" />
            <select
              value={hierarchyRootPid}
              onChange={(e) => setHierarchyRootPid(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
            >
              <option value="">Select a Level 1 agent to view their tree…</option>
              {roots.map((r: any) => (
                <option key={r.public_id} value={r.public_id}>
                  {r.full_name} {r.agency_name ? `(${r.agency_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {!hierarchyRootPid ? (
            <EmptyState icon={Users} heading="Pick an agent" description="Select a Level 1 agent above to see their full sub-agent / sub-sub-agent tree." />
          ) : treeQuery.isLoading ? (
            <div className="flex items-center justify-center min-h-[160px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
            </div>
          ) : treeQuery.data ? (
            <AgentTreeNode node={treeQuery.data as AgentNode} depth={0} />
          ) : (
            <EmptyState icon={Ban} heading="No tree data found" description="This agent has no recorded hierarchy." />
          )}
        </div>
      )}

      <CreateAgentPanel open={createOpen} onOpenChange={setCreateOpen} onSuccess={invalidateAll} />

      {/* Review modal */}
      <Dialog open={!!reviewPid} onOpenChange={(open) => { if (!open) { setReviewPid(null); setRejectReason('') } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">
            {detailQuery.data ? `Review application — ${detailQuery.data.full_name}` : 'Review agent application'}
          </DialogTitle>
          {detailQuery.isLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
            </div>
          ) : detailQuery.data ? (
            <AgentReviewBody
              agent={detailQuery.data}
              canApprove={canApprove}
              rejectReason={rejectReason}
              onRejectReasonChange={setRejectReason}
              onOpenDoc={openDoc}
              onApprove={() => approveMutation.mutate(detailQuery.data.public_id)}
              onReject={() => rejectMutation.mutate({ publicId: detailQuery.data.public_id, reason: rejectReason })}
              approving={approveMutation.isPending}
              rejecting={rejectMutation.isPending}
            />
          ) : (
            <EmptyState icon={Ban} heading="Could not load this agent" description="Please close and try again." />
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}

function AgentReviewBody({
  agent,
  canApprove,
  rejectReason,
  onRejectReasonChange,
  onOpenDoc,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  agent: AdminAgentDetail
  canApprove: boolean
  rejectReason: string
  onRejectReasonChange: (v: string) => void
  onOpenDoc: (filePid: string) => void
  onApprove: () => void
  onReject: () => void
  approving: boolean
  rejecting: boolean
}) {
  const isReviewable = agent.status === 'pending'

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-brand-navy">{agent.full_name}</h2>
          <StatusBadge status={agent.status as StatusType} />
          <span className="text-[10px] uppercase font-bold text-brand-orange-accessible bg-brand-orange-accessible/10 px-2 py-0.5 rounded">
            {tierLabel(agent.tier)}
          </span>
        </div>
        {agent.parent_agent_name && (
          <p className="text-xs text-muted-foreground mt-1">Sub-agent under {agent.parent_agent_name}</p>
        )}
        {agent.created_by_admin_name && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Added by admin: {agent.created_by_admin_name}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Email" value={agent.email} />
        <Field label="Mobile" value={agent.mobile_number} />
        <Field label="Alternate Mobile" value={agent.alternate_mobile_number} />
        <Field label="City" value={agent.city} />
        <Field label="State" value={agent.state} />
        <Field label="Country" value={agent.country} />
        <Field label="Address" value={agent.address_line} full />
        <Field label="Submitted" value={formatDate(agent.application_submitted_at)} />
      </div>

      {agent.status === 'rejected' && agent.rejected_reason && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
          <strong>Rejection reason:</strong> {agent.rejected_reason}
        </div>
      )}

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Documents</h3>
        <div className="space-y-2">
          {(['profile_photo', 'aadhar_card', 'cv_resume'] as const).map((docType) => {
            const doc = agent.documents[docType]
            return (
              <div key={docType} className="flex items-center justify-between p-2.5 rounded-lg border border-border-warm bg-surface-warm/40">
                <span className="text-sm text-brand-navy">{DOC_LABELS[docType]}</span>
                {doc ? (
                  <Button size="sm" variant="secondary" onClick={() => onOpenDoc(doc.public_id)}>
                    View
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Not uploaded</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {isReviewable && canApprove && (
        <div className="space-y-3 pt-2 border-t border-border-warm">
          <textarea
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="Rejection reason (optional)"
            className="w-full px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none min-h-[70px] resize-none"
          />
          <div className="flex gap-3">
            <Button variant="danger" className="flex-1" onClick={onReject} disabled={rejecting || approving}>
              <X className="h-4 w-4 mr-1" />
              {rejecting ? 'Rejecting…' : 'Reject'}
            </Button>
            <Button className="flex-1" onClick={onApprove} disabled={rejecting || approving}>
              <Check className="h-4 w-4 mr-1" />
              {approving ? 'Approving…' : 'Approve'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : undefined}>
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
      <p className="text-sm text-brand-navy">{value || '—'}</p>
    </div>
  )
}
