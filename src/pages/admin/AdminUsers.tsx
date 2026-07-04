import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban, BarChart2, BookOpen, Calendar, Check, Crown, DollarSign,
  Eye, EyeOff, FileText, Globe, Handshake, Key, Lock, Megaphone, Plus,
  Radar, Search, Settings, Shield, Target, Trash2, UserCog, Users, UserX,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createAdminStaffAccount,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type AdminUserSummary,
  type PageAccessLevel,
} from '../../lib/api'
import { usePermission } from '../../hooks/usePermission'
import { useAuth } from '../../shared/hooks/useAuth'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Button } from '../../shared/components/ui/Button'
import { StatCard } from '../../shared/components/ui/StatCard'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { UserAvatar } from '../../shared/components/ui/Avatar'
import {
  SlideOver,
  SlideOverContent,
  SlideOverHeader,
  SlideOverBody,
  SlideOverFooter,
  SlideOverTitle,
} from '../../shared/components/ui/SlideOverPanel'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalAction,
  ModalCancel,
} from '../../shared/components/ui/Modal'

// ─── Page catalogue (mirrors AdminPageAccessService::PAGE_PERMISSION_MAP) ─────
// hasWrite mirrors the backend's write bucket — pages without one (reports, super_logs,
// security) are inherently view-only, so they skip the read/write toggle entirely.

const PAGE_DEFS = [
  { key: 'universities', label: 'Universities',   icon: Globe,      description: 'Manage university catalog', hasWrite: true },
  { key: 'courses',      label: 'Courses',         icon: BookOpen,   description: 'Manage course catalog', hasWrite: true },
  { key: 'intakes',      label: 'Intakes',         icon: Calendar,   description: 'Manage intake windows', hasWrite: true },
  { key: 'students',     label: 'Students',        icon: Users,      description: 'View and manage students', hasWrite: true },
  { key: 'agents',       label: 'Agents',          icon: Handshake,  description: 'Approve and manage agents', hasWrite: true },
  { key: 'applications', label: 'Applications',    icon: FileText,   description: 'Application pipeline', hasWrite: true },
  { key: 'commissions',  label: 'Commissions',     icon: DollarSign, description: 'Commission tracking', hasWrite: true },
  { key: 'leads',        label: 'Leads',           icon: Target,     description: 'CRM lead pipeline', hasWrite: true },
  { key: 'notices',      label: 'Notices',         icon: Megaphone,  description: 'Publish portal notices', hasWrite: true },
  { key: 'reports',      label: 'Reports',         icon: BarChart2,  description: 'Analytics and reports', hasWrite: false },
  { key: 'users',        label: 'User Management', icon: Key,        description: 'Manage admin accounts', hasWrite: true },
  { key: 'settings',     label: 'Settings',        icon: Settings,   description: 'System configuration', hasWrite: true },
  { key: 'super_logs',   label: 'Super Activity Log', icon: Radar,  description: 'System-wide activity log across all admins, agents, and students', hasWrite: false },
  { key: 'security',     label: 'Security',        icon: Lock,       description: 'Security event log', hasWrite: false },
] as const

type PageKey = typeof PAGE_DEFS[number]['key']
type PageAccessMap = Record<string, PageAccessLevel>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fullName(user: AdminUserSummary): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function RoleBadge({ user }: { user: AdminUserSummary }) {
  if (user.is_super_admin) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-navy px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
        <Crown className="h-2.5 w-2.5" />
        Super Admin
      </span>
    )
  }
  const pageEntries = Object.entries(user.pages ?? {})
  const count = pageEntries.length
  const writeCount = pageEntries.filter(([, level]) => level === 'write').length
  if (count > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange-accessible/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-orange-accessible uppercase tracking-wide border border-brand-orange-accessible/20">
        <Shield className="h-2.5 w-2.5" />
        {count} page{count !== 1 ? 's' : ''}
        {writeCount > 0 && writeCount < count ? ` (${writeCount} write)` : ''}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-warm px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border border-border-warm">
      No Access
    </span>
  )
}

function StatusDot({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    )
  }
  if (status === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Suspended
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      {status}
    </span>
  )
}

// ─── Page Access Grid (per-page: no access / read only / full access) ─────────

const ACCESS_LEVELS: { value: 'none' | PageAccessLevel; label: string }[] = [
  { value: 'none', label: 'No Access' },
  { value: 'read', label: 'Read Only' },
  { value: 'write', label: 'Full Access' },
]

function PageAccessGrid({
  access,
  onChange,
  disabled,
}: {
  access: PageAccessMap
  onChange: (access: PageAccessMap) => void
  disabled?: boolean
}) {
  const setLevel = (key: string, level: 'none' | PageAccessLevel) => {
    const next = { ...access }
    if (level === 'none') {
      delete next[key]
    } else {
      next[key] = level
    }
    onChange(next)
  }

  const grantAllWrite = () => {
    const next: PageAccessMap = {}
    PAGE_DEFS.forEach(p => { next[p.key] = p.hasWrite ? 'write' : 'read' })
    onChange(next)
  }
  const clearAll = () => onChange({})

  const selectedCount = Object.keys(access).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Page Access
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={grantAllWrite}
            disabled={disabled}
            className="text-xs font-medium text-brand-orange-accessible hover:underline disabled:opacity-50"
          >
            Grant all (full)
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="text-xs font-medium text-muted-foreground hover:underline disabled:opacity-50"
          >
            Clear all
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {PAGE_DEFS.map(page => {
          const Icon = page.icon
          const level: 'none' | PageAccessLevel = access[page.key] ?? 'none'
          const options = page.hasWrite ? ACCESS_LEVELS : ACCESS_LEVELS.filter(o => o.value !== 'write')
          return (
            <div
              key={page.key}
              className={[
                'flex flex-col gap-2.5 rounded-xl border p-3 transition sm:flex-row sm:items-center sm:justify-between',
                level !== 'none'
                  ? 'border-brand-orange-accessible/40 bg-brand-orange-accessible/5'
                  : 'border-border-warm bg-surface-warm',
              ].join(' ')}
            >
              <div className="flex min-w-0 items-start gap-3">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-orange-accessible" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-navy">{page.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight">
                    {page.description}
                  </p>
                </div>
              </div>
              <div
                role="radiogroup"
                aria-label={`${page.label} access level`}
                className="inline-flex shrink-0 overflow-hidden rounded-lg border border-border-warm bg-surface-card"
              >
                {options.map((opt, i) => {
                  const isActive = level === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => setLevel(page.key, opt.value)}
                      disabled={disabled}
                      className={[
                        'px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap transition disabled:opacity-50',
                        i > 0 ? 'border-l border-border-warm' : '',
                        isActive
                          ? opt.value === 'write'
                            ? 'bg-emerald-600 text-white'
                            : opt.value === 'read'
                              ? 'bg-brand-navy text-white'
                              : 'bg-surface-warm text-muted-foreground'
                          : 'text-muted-foreground hover:bg-surface-warm',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {selectedCount > 0 && (
        <p className="text-right text-xs text-muted-foreground">
          {selectedCount} of {PAGE_DEFS.length} pages granted
        </p>
      )}
    </div>
  )
}

// ─── Create Admin Panel ───────────────────────────────────────────────────────

const defaultForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  isSuperAdmin: false,
  pages: {} as PageAccessMap,
}

function CreateAdminPanel({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [form, setForm] = React.useState(defaultForm)
  const [showPwd, setShowPwd] = React.useState(false)

  const set = (patch: Partial<typeof defaultForm>) => setForm(prev => ({ ...prev, ...patch }))

  const mutation = useMutation({
    mutationFn: () =>
      createAdminStaffAccount({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        is_super_admin: form.isSuperAdmin,
        pages: form.isSuperAdmin ? {} : form.pages,
      }),
    onSuccess: () => {
      toast.success('Admin account created.')
      setForm(defaultForm)
      onOpenChange(false)
      onSuccess()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create admin.'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Enter both first and last name.')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    if (!form.isSuperAdmin && Object.keys(form.pages).length === 0) {
      toast.error('Select at least one page, or grant super admin access.')
      return
    }
    mutation.mutate()
  }

  const inputCls =
    'w-full rounded-lg border border-border-warm bg-surface-warm px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-muted-foreground focus:border-brand-orange-accessible focus:outline-none focus:ring-1 focus:ring-brand-orange-accessible/30 transition'

  return (
    <SlideOver open={open} onOpenChange={onOpenChange}>
      <SlideOverContent>
        <SlideOverHeader>
          <SlideOverTitle>Create Admin Account</SlideOverTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            New staff will be able to log in immediately.
          </p>
        </SlideOverHeader>

        <SlideOverBody>
          <form id="create-admin-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-navy">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls}
                  placeholder="Priya"
                  value={form.firstName}
                  onChange={e => set({ firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-navy">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls}
                  placeholder="Sharma"
                  value={form.lastName}
                  onChange={e => set({ lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-navy">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className={inputCls}
                placeholder="priya@theglobalavenues.com"
                value={form.email}
                onChange={e => set({ email: e.target.value })}
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-navy">
                Phone <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                className={inputCls}
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={e => set({ phone: e.target.value })}
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-navy">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className={inputCls + ' pr-10'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => set({ password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-brand-navy"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-navy">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                className={inputCls}
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={e => set({ confirmPassword: e.target.value })}
                required
              />
            </div>

            {/* Access section */}
            <div className="border-t border-border-warm pt-4 space-y-4">
              {/* Super Admin toggle */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-warm bg-surface-warm p-3.5 hover:border-brand-navy/30 transition">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded accent-brand-navy"
                  checked={form.isSuperAdmin}
                  onChange={e => set({ isSuperAdmin: e.target.checked, pages: {} })}
                />
                <div>
                  <p className="text-sm font-semibold text-brand-navy flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-brand-orange-accessible" />
                    Super Administrator
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Full access to all pages. Can manage other admin accounts. This cannot be reversed through the UI.
                  </p>
                </div>
              </label>

              {/* Page access grid (only when not super admin) */}
              {!form.isSuperAdmin && (
                <PageAccessGrid
                  access={form.pages}
                  onChange={pages => set({ pages })}
                />
              )}
            </div>
          </form>
        </SlideOverBody>

        <SlideOverFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="create-admin-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating…' : 'Create Account'}
          </Button>
        </SlideOverFooter>
      </SlideOverContent>
    </SlideOver>
  )
}

// ─── Edit Access Panel ────────────────────────────────────────────────────────

function EditAccessPanel({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: AdminUserSummary | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [selectedPages, setSelectedPages] = React.useState<PageAccessMap>({})

  React.useEffect(() => {
    if (user) {
      setSelectedPages(user.pages ?? {})
    }
  }, [user])

  const mutation = useMutation({
    mutationFn: () =>
      updateAdminUser({
        public_id: user!.public_id,
        pages: selectedPages,
      }),
    onSuccess: () => {
      toast.success('Access updated.')
      onOpenChange(false)
      onSuccess()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update access.'),
  })

  function handleSave() {
    if (Object.keys(selectedPages).length === 0) {
      toast.error('Select at least one page to grant access.')
      return
    }
    mutation.mutate()
  }

  return (
    <SlideOver open={open} onOpenChange={onOpenChange}>
      <SlideOverContent>
        <SlideOverHeader>
          <SlideOverTitle>Edit Page Access</SlideOverTitle>
          {user && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Updating access for{' '}
              <span className="font-semibold text-brand-navy">{fullName(user)}</span>
            </p>
          )}
        </SlideOverHeader>

        <SlideOverBody>
          {user && (
            <div className="space-y-5">
              {/* Identity card */}
              <div className="flex items-center gap-3 rounded-xl border border-border-warm bg-surface-warm p-4">
                <UserAvatar name={fullName(user)} size="md" />
                <div>
                  <p className="text-sm font-semibold text-brand-navy">{fullName(user)}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
                Changes take effect on the admin's next page load. Existing sessions are not
                immediately invalidated.
              </div>

              <div className="border-t border-border-warm pt-4">
                <PageAccessGrid
                  access={selectedPages}
                  onChange={setSelectedPages}
                  disabled={mutation.isPending}
                />
              </div>
            </div>
          )}
        </SlideOverBody>

        <SlideOverFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : 'Save Access'}
          </Button>
        </SlideOverFooter>
      </SlideOverContent>
    </SlideOver>
  )
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

function AdminTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border-warm bg-surface-card">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-surface-warm/60">
              {['Staff Member', 'Access', 'Status', 'Last Login', 'Added', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-warm">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-surface-warm animate-pulse" />
                    <div className="space-y-1">
                      <div className="h-3 w-28 rounded bg-surface-warm animate-pulse" />
                      <div className="h-2.5 w-40 rounded bg-surface-warm animate-pulse" />
                    </div>
                  </div>
                </td>
                {[...Array(5)].map((_, j) => (
                  <td key={j} className="px-4 py-3.5">
                    <div className="h-3 w-20 rounded bg-surface-warm animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col divide-y divide-border-warm">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="h-8 w-8 rounded-full bg-surface-warm animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 rounded bg-surface-warm animate-pulse" />
              <div className="h-2.5 w-44 rounded bg-surface-warm animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const isSuperAdmin = me?.permissions?.includes('*') ?? false

  const canCreate = usePermission('user_management', 'create')
  const canEdit = usePermission('user_management', 'edit')

  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('')

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editUser, setEditUser] = React.useState<AdminUserSummary | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUserSummary | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────────
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', roleFilter, statusFilter, debouncedSearch],
    queryFn: () =>
      fetchAdminUsers({
        perPage: 100,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        q: debouncedSearch || undefined,
      }),
    staleTime: 30_000,
  })

  const users: AdminUserSummary[] = usersQuery.data?.users ?? []

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = React.useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    superAdmins: users.filter(u => u.is_super_admin).length,
  }), [users])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })

  const statusMutation = useMutation({
    mutationFn: (p: { public_id: string; status: string }) => updateAdminUser(p),
    onSuccess: (_d, vars) => {
      toast.success(vars.status === 'active' ? 'Account activated.' : 'Account suspended.')
      void invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Update failed.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deleteAdminUser(publicId),
    onSuccess: () => {
      toast.success('Admin account deleted.')
      setDeleteTarget(null)
      void invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Delete failed.'),
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  const inputCls =
    'rounded-lg border border-border-warm bg-surface-warm px-3 py-2 text-sm text-brand-navy placeholder:text-muted-foreground focus:border-brand-orange-accessible focus:outline-none focus:ring-1 focus:ring-brand-orange-accessible/30 transition'

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Admin Users"
        subtitle="Manage staff accounts and control which pages each person can access."
        actions={
          isSuperAdmin && canCreate ? (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Admin
            </Button>
          ) : undefined
        }
      />

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Staff" value={usersQuery.isLoading ? '…' : stats.total} icon={Users} color="navy" isLoading={usersQuery.isLoading} />
        <StatCard label="Active" value={usersQuery.isLoading ? '…' : stats.active} icon={Check} color="green" isLoading={usersQuery.isLoading} />
        <StatCard label="Suspended" value={usersQuery.isLoading ? '…' : stats.suspended} icon={UserX} color="orange" isLoading={usersQuery.isLoading} />
        <StatCard label="Super Admins" value={usersQuery.isLoading ? '…' : stats.superAdmins} icon={Crown} color="amber" isLoading={usersQuery.isLoading} />
      </div>

      {/* ── Filter toolbar ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-border-warm bg-surface-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={inputCls + ' w-full pl-9'}
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className={inputCls + ' w-full sm:w-44'}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>

        <select
          className={inputCls + ' w-full sm:w-48'}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      {/* ── Table ── */}
      {usersQuery.isError ? (
        <EmptyState
          heading="Could not load admin users"
          description={usersQuery.error instanceof Error ? usersQuery.error.message : 'Backend request failed.'}
          action={<Button onClick={() => usersQuery.refetch()}>Retry</Button>}
        />
      ) : usersQuery.isLoading ? (
        <AdminTableSkeleton />
      ) : users.length === 0 ? (
        <EmptyState
          heading="No admin accounts found"
          description="Try adjusting your filters or create the first admin."
          action={
            isSuperAdmin && canCreate ? (
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Admin
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-warm bg-surface-card">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-border-warm bg-surface-warm/60">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Staff Member</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Access</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last Login</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Added</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-warm">
                {users.map(user => (
                  <AdminRow
                    key={user.public_id}
                    user={user}
                    canEdit={canEdit}
                    isSelfSuperAdmin={isSuperAdmin}
                    selfPublicId={me?.publicId ?? ''}
                    onActivate={() => statusMutation.mutate({ public_id: user.public_id, status: 'active' })}
                    onSuspend={() => statusMutation.mutate({ public_id: user.public_id, status: 'suspended' })}
                    onEditAccess={() => setEditUser(user)}
                    onDelete={() => {
                      if (user.public_id && user.public_id !== (me?.publicId ?? '__NONE__')) {
                        setDeleteTarget(user)
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden flex flex-col divide-y divide-border-warm">
            {users.map(user => (
              <AdminMobileCard
                key={user.public_id}
                user={user}
                canEdit={canEdit}
                isSelfSuperAdmin={isSuperAdmin}
                selfPublicId={me?.publicId ?? ''}
                onActivate={() => statusMutation.mutate({ public_id: user.public_id, status: 'active' })}
                onSuspend={() => statusMutation.mutate({ public_id: user.public_id, status: 'suspended' })}
                onEditAccess={() => setEditUser(user)}
                onDelete={() => {
                  if (user.public_id && user.public_id !== (me?.publicId ?? '__NONE__')) {
                    setDeleteTarget(user)
                  }
                }}
              />
            ))}
          </div>

          <div className="border-t border-border-warm bg-surface-warm/40 px-4 py-2.5 text-xs text-muted-foreground">
            {users.length} account{users.length !== 1 ? 's' : ''} shown
          </div>
        </div>
      )}

      {/* ── Create Panel ── */}
      <CreateAdminPanel
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={invalidate}
      />

      {/* ── Edit Access Panel ── */}
      <EditAccessPanel
        user={editUser}
        open={!!editUser}
        onOpenChange={v => { if (!v) setEditUser(null) }}
        onSuccess={invalidate}
      />

      {/* ── Delete Confirm ── */}
      <Modal open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete Admin Account</ModalTitle>
            <ModalDescription>
              Permanently remove{' '}
              <strong>{deleteTarget ? fullName(deleteTarget) : ''}</strong>? They will lose
              all access immediately. This action cannot be undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <ModalCancel />
            <ModalAction
              variant="danger"
              onClick={() => {
                if (deleteTarget && deleteTarget.public_id !== (me?.publicId ?? '__NONE__')) {
                  deleteMutation.mutate(deleteTarget.public_id)
                }
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete Account
            </ModalAction>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageWrapper>
  )
}

// ─── Row component ────────────────────────────────────────────────────────────

function AdminRow({
  user,
  canEdit,
  isSelfSuperAdmin,
  selfPublicId,
  onActivate,
  onSuspend,
  onEditAccess,
  onDelete,
}: {
  user: AdminUserSummary
  canEdit: boolean
  isSelfSuperAdmin: boolean
  selfPublicId: string
  onActivate: () => void
  onSuspend: () => void
  onEditAccess: () => void
  onDelete: () => void
}) {
  const isSelf = user.public_id === selfPublicId
  const name = fullName(user)

  return (
    <tr className="group hover:bg-surface-warm/50 transition-colors">
      {/* Staff member */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <UserAvatar name={name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-brand-navy leading-tight">
              {name}
              {isSelf && (
                <span className="ml-2 rounded bg-brand-navy/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-navy">
                  You
                </span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Access badge */}
      <td className="px-4 py-3.5">
        <RoleBadge user={user} />
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusDot status={user.status} />
      </td>

      {/* Last login */}
      <td className="px-4 py-3.5 text-xs text-muted-foreground">
        {formatDateTime(user.last_login_at)}
      </td>

      {/* Created */}
      <td className="px-4 py-3.5 text-xs text-muted-foreground">
        {formatDate(user.created_at)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
        <InlineActions
          actions={[
            {
              // Only super admins can edit access; super admin rows are locked
              label: 'Edit Page Access',
              icon: UserCog,
              onClick: onEditAccess,
              hidden: !canEdit || !isSelfSuperAdmin || isSelf || user.is_super_admin,
            },
            {
              label: 'Activate Account',
              icon: Check,
              onClick: onActivate,
              hidden: !canEdit || user.status === 'active' || isSelf,
            },
            {
              label: 'Suspend Access',
              icon: Ban,
              onClick: onSuspend,
              variant: 'danger' as const,
              hidden: !canEdit || user.status === 'suspended' || isSelf || user.is_super_admin,
            },
            {
              // Super admin accounts cannot be deleted through the UI
              label: 'Delete Account',
              icon: Trash2,
              onClick: onDelete,
              variant: 'danger' as const,
              hidden: !isSelfSuperAdmin || isSelf || user.is_super_admin,
            },
          ]}
        />
      </td>
    </tr>
  )
}

// ─── Mobile card (same data/actions as AdminRow, stacked layout) ──────────────

function AdminMobileCard({
  user,
  canEdit,
  isSelfSuperAdmin,
  selfPublicId,
  onActivate,
  onSuspend,
  onEditAccess,
  onDelete,
}: {
  user: AdminUserSummary
  canEdit: boolean
  isSelfSuperAdmin: boolean
  selfPublicId: string
  onActivate: () => void
  onSuspend: () => void
  onEditAccess: () => void
  onDelete: () => void
}) {
  const isSelf = user.public_id === selfPublicId
  const name = fullName(user)

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar name={name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-brand-navy leading-tight">
              {name}
              {isSelf && (
                <span className="ml-2 rounded bg-brand-navy/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-navy">
                  You
                </span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <InlineActions
            actions={[
              {
                label: 'Edit Page Access',
                icon: UserCog,
                onClick: onEditAccess,
                hidden: !canEdit || !isSelfSuperAdmin || isSelf || user.is_super_admin,
              },
              {
                label: 'Activate Account',
                icon: Check,
                onClick: onActivate,
                hidden: !canEdit || user.status === 'active' || isSelf,
              },
              {
                label: 'Suspend Access',
                icon: Ban,
                onClick: onSuspend,
                variant: 'danger' as const,
                hidden: !canEdit || user.status === 'suspended' || isSelf || user.is_super_admin,
              },
              {
                label: 'Delete Account',
                icon: Trash2,
                onClick: onDelete,
                variant: 'danger' as const,
                hidden: !isSelfSuperAdmin || isSelf || user.is_super_admin,
              },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="mb-1 font-semibold uppercase text-[10px] text-muted-foreground">Access</p>
          <RoleBadge user={user} />
        </div>
        <div>
          <p className="mb-1 font-semibold uppercase text-[10px] text-muted-foreground">Status</p>
          <StatusDot status={user.status} />
        </div>
        <div>
          <p className="mb-1 font-semibold uppercase text-[10px] text-muted-foreground">Last Login</p>
          <p className="text-muted-foreground">{formatDateTime(user.last_login_at)}</p>
        </div>
        <div>
          <p className="mb-1 font-semibold uppercase text-[10px] text-muted-foreground">Added</p>
          <p className="text-muted-foreground">{formatDate(user.created_at)}</p>
        </div>
      </div>
    </div>
  )
}
