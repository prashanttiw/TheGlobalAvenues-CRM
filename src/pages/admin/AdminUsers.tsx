import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { DataTable, type ColumnDef } from '../../shared/components/ui/DataTable'
import { StatusBadge, type StatusType } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { SlideOverPanel } from '../../shared/components/ui/SlideOverPanel'
import { InlineActions } from '../../shared/components/ui/InlineActions'
import { Users, Plus, Shield, ShieldAlert, Ban, Check, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { usePermission } from '../../hooks/usePermission'

interface AdminUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admissions_staff' | 'visa_officer' | 'finance_manager'
  status: StatusType
  lastActive: string
}

const MOCK_USERS: AdminUser[] = [
  {
    id: 'usr-1',
    name: 'Amit Tiwari',
    email: 'amit.tiwari@globalavenues.com',
    role: 'super_admin',
    status: 'approved',
    lastActive: 'Active Now',
  },
  {
    id: 'usr-2',
    name: 'Sarah Connor',
    email: 'sarah.c@globalavenues.com',
    role: 'admissions_staff',
    status: 'approved',
    lastActive: '10 mins ago',
  },
  {
    id: 'usr-3',
    name: 'John Doe',
    email: 'john.doe@globalavenues.com',
    role: 'visa_officer',
    status: 'pending',
    lastActive: '2 days ago',
  },
  {
    id: 'usr-4',
    name: 'Jane Smith',
    email: 'jane.smith@globalavenues.com',
    role: 'finance_manager',
    status: 'approved',
    lastActive: '1 hour ago',
  },
]

export default function AdminUsers() {
  const [users, setUsers] = React.useState<AdminUser[]>(MOCK_USERS)
  const [roleFilter, setRoleFilter] = React.useState('all')
  const [isAddOpen, setIsAddOpen] = React.useState(false)

  const canCreate = usePermission('user_management', 'create')
  const canEdit = usePermission('user_management', 'edit')
  const canDelete = usePermission('user_management', 'delete')

  const [form, setForm] = React.useState({
    name: '',
    email: '',
    role: 'admissions_staff' as 'super_admin' | 'admissions_staff' | 'visa_officer' | 'finance_manager',
    status: 'approved' as StatusType,
  })

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (users.some(u => u.email.toLowerCase() === form.email.toLowerCase())) {
      toast.error('User email already exists.')
      return
    }

    const newUser: AdminUser = {
      id: `usr-${Date.now()}`,
      name: form.name,
      email: form.email,
      role: form.role,
      status: form.status,
      lastActive: 'Never',
    }

    setUsers([...users, newUser])
    setIsAddOpen(false)
    setForm({
      name: '',
      email: '',
      role: 'admissions_staff',
      status: 'approved',
    })
    toast.success('Admin user created successfully!')
  }

  const handleSuspend = (id: string, name: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: 'suspended' as StatusType } : u))
    toast.success(`Suspended access for ${name}`)
  }

  const handleActivate = (id: string, name: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: 'approved' as StatusType } : u))
    toast.success(`Activated access for ${name}`)
  }

  const handleDelete = (id: string, name: string) => {
    setUsers(users.filter(u => u.id !== id))
    toast.success(`Removed admin user: ${name}`)
  }

  const filteredUsers = users.filter(u => {
    if (roleFilter === 'all') return true
    return u.role === roleFilter
  })

  const columns: ColumnDef<AdminUser>[] = [
    {
      key: 'user',
      header: 'Staff Member',
      cell: (row) => (
        <div>
          <p className="font-semibold text-brand-navy">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role Profile',
      cell: (row) => (
        <span className="text-[10px] uppercase font-bold text-brand-navy bg-brand-navy/5 px-2 py-0.5 rounded border border-border-warm">
          {row.role.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.lastActive}</span>,
    },
    {
      key: 'status',
      header: 'Access Status',
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
                label: 'Activate User', 
                icon: Check, 
                onClick: () => handleActivate(row.id, row.name),
                hidden: !canEdit || row.status === 'approved' 
              },
              { 
                label: 'Suspend Access', 
                icon: Ban, 
                onClick: () => handleSuspend(row.id, row.name), 
                variant: 'danger', 
                hidden: !canEdit || row.status === 'suspended' 
              },
              { 
                label: 'Delete Admin User', 
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
        title="Admin Users Management" 
        subtitle="Manage administrative staff accounts, permission assignments, and access control."
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Admin
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-surface-card p-4 rounded-xl border border-border-warm items-center">
        <select 
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-60 px-3 py-2 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
          aria-label="Filter by Role Profile"
        >
          <option value="all">All Role Profiles</option>
          <option value="super_admin">Super Administrator</option>
          <option value="admissions_staff">Admissions Sub-Admin</option>
          <option value="visa_officer">Visa Officer</option>
          <option value="finance_manager">Finance Specialist</option>
        </select>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredUsers}
        emptyMessage="No admin users match the selected criteria."
      />

      <SlideOverPanel 
        title="Create Admin Account" 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen}
      >
        <form onSubmit={handleAddUser} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Full Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. John Miller"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="e.g. john.miller@globalavenues.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Role Profile</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                <option value="admissions_staff">Admissions Sub-Admin</option>
                <option value="visa_officer">Visa Officer</option>
                <option value="finance_manager">Finance Specialist</option>
                <option value="super_admin">Super Administrator</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-navy block mb-1">Initial Access Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StatusType })}
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-border-warm rounded-md text-sm text-brand-navy focus:outline-none"
              >
                <option value="approved">Approved & Active</option>
                <option value="pending">Pending Review</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-border-warm flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create User</Button>
          </div>
        </form>
      </SlideOverPanel>
    </PageWrapper>
  )
}
