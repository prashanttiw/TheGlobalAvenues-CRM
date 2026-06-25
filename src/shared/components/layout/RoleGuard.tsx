import * as React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, type Role } from '../../hooks/useAuth'

interface RoleGuardProps {
  allowedRoles: Role[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Render forbidden component via routing or direct redirect
    return <Navigate to="/portal/403" replace />
  }

  return <>{children}</>
}
