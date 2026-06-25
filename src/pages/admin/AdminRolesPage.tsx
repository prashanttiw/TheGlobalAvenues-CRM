import * as React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { PageWrapper } from '../../shared/components/layout/PageWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Key, Shield, UserCheck, Eye, Lock } from 'lucide-react'

interface RoleConfig {
  name: string
  key: string
  description: string
  permissions: string[]
  activeUsersCount: number
}

const MOCK_ROLES: RoleConfig[] = [
  {
    name: 'Super Administrator',
    key: 'super_admin',
    description: 'Unrestricted administrative access to all CRM functions, system databases, security configurations, and audit logs.',
    permissions: ['* (All System Permissions)'],
    activeUsersCount: 2,
  },
  {
    name: 'Admissions Sub-Admin',
    key: 'admissions_staff',
    description: 'Manages university catalogs, course directories, intakes, agent accounts, and monitors student applications progress.',
    permissions: [
      'universities.view',
      'courses.view',
      'intakes.view',
      'students.view',
      'agents.view',
      'applications.view',
      'applications.edit',
      'documents.view',
      'documents.verify',
    ],
    activeUsersCount: 5,
  },
  {
    name: 'Visa Officer',
    key: 'visa_officer',
    description: 'Restricted compliance and visa status auditing permissions. Intended for reviewing student travel documentation.',
    permissions: [
      'students.view',
      'applications.view',
      'documents.view',
      'documents.verify',
    ],
    activeUsersCount: 2,
  },
  {
    name: 'Finance Specialist',
    key: 'finance_manager',
    description: 'Manages agent commissions computations, validates payments transactions, and generates financial reporting digests.',
    permissions: [
      'commissions.view',
      'commissions.approve',
      'commissions.pay',
      'reports.view',
    ],
    activeUsersCount: 1,
  },
]

export default function AdminRolesPage() {
  return (
    <PageWrapper className="space-y-6">
      <PageHeader 
        title="Role Permissions Mapping" 
        subtitle="View authorization profiles, access structures, and token scopes across system staff."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {MOCK_ROLES.map((role) => (
          <Card key={role.key} className="flex flex-col justify-between hover:shadow-card-hover transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy shrink-0">
                    {role.key === 'super_admin' ? (
                      <Lock className="h-5 w-5 text-brand-orange-accessible" />
                    ) : (
                      <Shield className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-brand-navy">{role.name}</CardTitle>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{role.key}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {role.activeUsersCount} Active Users
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                {role.description}
              </p>
            </CardHeader>
            <CardContent className="mt-4 border-t border-border-warm pt-4">
              <span className="text-xs font-semibold text-brand-navy block mb-2">Scope Permissions</span>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map((perm) => (
                  <span 
                    key={perm} 
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      perm.includes('*') 
                        ? 'bg-orange-100 text-orange-800 border-orange-200 font-bold' 
                        : 'bg-surface-warm text-brand-navy border-border-warm'
                    }`}
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  )
}
