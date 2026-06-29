import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../shared/hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, status } = useAuth()

  if (isLoading || status === 'loading') {
    return null
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/portal/login" replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/portal/admin" replace />
    if (user.role === 'agent') return <Navigate to="/portal/agent" replace />
    return <Navigate to="/portal/student" replace />
  }

  return <>{children}</>
}
