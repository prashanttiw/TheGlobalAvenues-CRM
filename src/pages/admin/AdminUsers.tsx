import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check, Plus } from 'lucide-react'
import { createAdminStaffAccount, fetchAdminRoles, fetchAdminUsers, updateAdminUser } from '../../lib/api'
import { usePermission } from '../../hooks/usePermission'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Badge, StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { toast } from 'sonner'

interface AdminUserRow {
  public_id: string
  email: string
  role: string
  status: string
  createdAt: string
  firstName: string | null
  lastName: string | null
}

const KNOWN_STATUSES = new Set<StatusType>(['pending', 'approved', 'suspended'])

function renderStatus(status: string) {
  if (status === 'active') return <StatusBadge status="approved" />
  if (status === 'suspended') return <StatusBadge status="suspended" />
  if (KNOWN_STATUSES.has(status as StatusType)) return <StatusBadge status={status as StatusType} />
  return <Badge variant="secondary">{status}</Badge>
}

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const [roleFilter, setRoleFilter] = React.useState('')
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const canCreate = usePermission('user_management', 'create')
  const canEdit = usePermission('user_management', 'edit')

  const [form, setForm] = React.useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
  })

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', roleFilter],
    queryFn: () => fetchAdminUsers({ perPage: 100, role: roleFilter || undefined }),
    staleTime: 30_000,
  })

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: fetchAdminRoles,
    staleTime: 60_000,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { public_id: string; status?: string }) => updateAdminUser(payload),
    onSuccess: () => {
      toast.success('User access updated.')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update user.'),
  })

  const createMutation = useMutation({
    mutationFn: (payload: { first_name: string; last_name: string; email: string; phone?: string; password: string; role_id?: number | null }) => createAdminStaffAccount(payload),
    onSuccess: () => {
      toast.success('Admin user created successfully.')
      setIsAddOpen(false)
      setForm({ fullName: '', email: '', phone: '', password: '', roleId: '' })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create admin user.'),
  })

  const users = (usersQuery.data?.users ?? []) as AdminUserRow[]
  const roles = (rolesQuery.data ?? []) as any[]

  const columns: ColumnDef<AdminUserRow>[] = [
    {
      key: 'user',
      header: 'Staff Member',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{[row.firstName, row.lastName].filter(Boolean).join(' ') || row.email}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role Profile',
      cell: (row) => (
        <span className="text-[10px] uppercase font-bold text-brand-navy bg-brand-navy/5 px-2 py-0.5 rounded border border-border-warm">
          {row.role.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      cell: (row) => <span className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</span>,
    },
    {
      key: 'status',
      header: 'Access Status',
      cell: (row) => renderStatus(row.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineActions
            actions={[
              {
                label: 'Activate User',
                icon: Check,
                onClick: () => updateMutation.mutate({ public_id: row.public_id, status: 'active' }),
                hidden: !canEdit || row.status === 'active',
              },
              {
                label: 'Suspend Access',
                icon: Ban,
                onClick: () => updateMutation.mutate({ public_id: row.public_id, status: 'suspended' }),
                variant: 'danger',
                hidden: !canEdit || row.status === 'suspended',
              },
            ]}
          />
        </div>
      ),
    },
  ]

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const [firstName, ...rest] = form.fullName.trim().split(/\s+/)
    const lastName = rest.join(' ')
    if (!firstName || !lastName) {
      toast.error('Enter full name with first and last name.')
      return
    }
    createMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      password: form.password,
      role_id: form.roleId ? Number(form.roleId) : undefined,
    })
  }

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title="Admin Users Management"
        subtitle="Manage live administrative staff accounts and access control."
        actions={canCreate ? <Button variant="primary" onClick={() => setIsAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Admin</Button> : undefined}
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm items-center">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-60 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          aria-label="Filter by Role Profile"
        >
          <option value="">All Role Profiles</option>
          <option value="super_admin">Super Administrator</option>
          {roles.map((role) => (
            <option key={role.public_id} value={role.name}>{role.name}</option>
          ))}
        </select>
      </div>

      {usersQuery.isError ? (
        <EmptyState heading="Admin users could not be loaded" description={usersQuery.error instanceof Error ? usersQuery.error.message : 'The backend request failed.'} action={<Button onClick={() => usersQuery.refetch()}>Retry</Button>} />
      ) : (
        <DataTable columns={columns} data={users} isLoading={usersQuery.isLoading} emptyMessage="No admin users match the selected criteria." />
      )}

      <SlideOverPanel title="Create Admin Account" open={isAddOpen} onOpenChange={setIsAddOpen}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Full Name</label>
              <input type="text" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Email Address</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Password</label>
              <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Role Profile</label>
              <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none">
                <option value="">No specific role</option>
                {roles.map((role) => (
                  <option key={role.public_id} value={String(role.id)}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={createMutation.isPending}>Create User</Button>
          </div>
        </form>
      </SlideOverPanel>
    </PageWrapper>
  )
}
