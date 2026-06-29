import * as React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-warm">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-warm border-t-brand-orange-accessible" />
    </div>
  )
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, restoreSession, status } = useAuth()
  const location = useLocation()

  React.useEffect(() => {
    if (status === 'loading') {
      void restoreSession()
    }
  }, [restoreSession, status])

  if (isLoading || status === 'loading') {
    return <AuthLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
