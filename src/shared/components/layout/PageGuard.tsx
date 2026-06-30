import * as React from 'react'
import { ShieldOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface PageGuardProps {
  permission: string
  children: React.ReactNode
}

export function PageGuard({ permission, children }: PageGuardProps) {
  const { user } = useAuth()

  if (!user) return null

  const isSuperAdmin = user.isSuperAdmin === true || (user.permissions?.includes('*') ?? false)
  const hasPermission = isSuperAdmin || (user.permissions?.includes(permission) ?? false)

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-50/50">
          <ShieldOff className="h-7 w-7 text-red-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-brand-navy">Access Restricted</h2>
        <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
          You don't have permission to view this page. Contact a super admin to request access.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
