import * as React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, type Role } from '../../hooks/useAuth'

interface RoleGuardProps {
  allowedRoles: Role[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading, status } = useAuth()
  const location = useLocation()

  if (isLoading || status === 'loading') {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/portal/403" replace />
  }

  if (
    user.role === 'agent' &&
    user.agentStatus === 'pending' &&
    !location.pathname.includes('/onboarding')
  ) {
    return <Navigate to="/portal/agent/onboarding" replace />
  }

  return <>{children}</>
}
