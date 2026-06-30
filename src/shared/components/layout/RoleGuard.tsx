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

  if (user.role === 'agent') {
    const path = location.pathname
    const isOnboardingPath = path === '/portal/agent/onboarding' || path === '/portal/agent/info'

    switch (user.agentStatus) {
      case 'registered':
      case 'draft':
        if (!isOnboardingPath) {
          return <Navigate to="/portal/agent/onboarding" replace />
        }
        break
      case 'pending':
        if (path !== '/portal/agent/pending') {
          return <Navigate to="/portal/agent/pending" replace />
        }
        break
      case 'rejected':
        if (path !== '/portal/agent/rejected' && !isOnboardingPath) {
          return <Navigate to="/portal/agent/rejected" replace />
        }
        break
      case 'suspended':
        if (path !== '/portal/agent/rejected') {
          return <Navigate to="/portal/agent/rejected" replace />
        }
        break
      default:
        // 'approved' (or unset) — full portal nav, no redirect
        break
    }
  }

  return <>{children}</>
}
