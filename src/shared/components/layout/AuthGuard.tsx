import * as React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Redirect to login page and preserve intended destination
    return <Navigate to="/portal/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
