import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Lock, Shield } from 'lucide-react'
import { fetchAdminRoles, fetchAdminUsers } from '../../lib/api'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Badge } from '../../shared/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { Button } from '../../shared/components/ui/Button'

export default function AdminRolesPage() {
  const rolesQuery = useQuery({ queryKey: ['admin', 'roles', 'page'], queryFn: fetchAdminRoles, staleTime: 60_000 })
  const superAdminsQuery = useQuery({ queryKey: ['admin', 'users', 'super-admins'], queryFn: () => fetchAdminUsers({ role: 'super_admin', perPage: 100 }), staleTime: 60_000 })

  const roles = (rolesQuery.data ?? []) as any[]
  const superAdminCount = superAdminsQuery.data?.users?.length ?? 0
  const cards = [
    { key: 'super_admin', name: 'Super Administrator', description: 'Full unrestricted platform access.', permissions: ['*'], activeUsersCount: superAdminCount },
    ...roles.map((role) => ({ key: role.public_id, name: role.name, description: role.description || 'No description provided.', permissions: role.permissions || [], activeUsersCount: Number(role.admin_count || 0) })),
  ]

  if (rolesQuery.isError) {
    return <PageWrapper><EmptyState heading="Roles could not be loaded" description={rolesQuery.error instanceof Error ? rolesQuery.error.message : 'The backend request failed.'} action={<Button onClick={() => rolesQuery.refetch()}>Retry</Button>} /></PageWrapper>
  }

  return (
    <PageWrapper className="space-y-6">
      <PageHeader title="Role Permissions Mapping" subtitle="View live authorization profiles and permission scopes across system staff." />
      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((role) => (
          <Card key={role.key} className="flex flex-col justify-between hover:shadow-card-hover transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy shrink-0">
                    {role.key === 'super_admin' ? <Lock className="h-5 w-5 text-brand-orange-accessible" /> : <Shield className="h-5 w-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-brand-navy">{role.name}</CardTitle>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{role.key}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">{role.activeUsersCount} Active Users</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-4 leading-relaxed">{role.description}</p>
            </CardHeader>
            <CardContent className="mt-4 border-t border-border-warm pt-4">
              <span className="text-xs font-semibold text-brand-navy block mb-2">Scope Permissions</span>
              <div className="flex flex-wrap gap-1.5">
                {(role.permissions.length ? role.permissions : ['No permissions assigned']).map((perm: string) => (
                  <span key={perm} className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${perm.includes('*') ? 'bg-orange-100 text-orange-800 border-orange-200 font-bold' : 'bg-surface-warm text-brand-navy border-border-warm'}`}>{perm}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  )
}
