import * as React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, type NavItem } from './Sidebar'
import { TopBar } from './TopBar'
import { SkipToContentLink } from '../ui/SkipToContentLink'
import { DashboardErrorBoundary } from '../ui/ErrorBoundaryFallback'
import { Toaster } from '../ui/Toast'
import { CommandPalette } from '../utilities/CommandPalette'

interface DashboardLayoutProps {
  sidebarItems: NavItem[]
  logo: string | React.ReactNode
  user: {
    name: string
    role: string
    avatar?: string
    tier?: string
    referralCode?: string
  }
  onLogout: () => void
}

export function DashboardLayout({ sidebarItems, logo, user, onLogout }: DashboardLayoutProps) {
  const location = useLocation()

  const pageTitle = React.useMemo(() => {
    const path = location.pathname.toLowerCase()
    if (path === '/portal/student' || path === '/portal/student/') return 'Student Journey'
    if (path === '/portal/agent' || path === '/portal/agent/') return 'Agent Overview'
    if (path === '/portal/admin' || path === '/portal/admin/') return 'Admin Dashboard'
    
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) return 'Portal'
    const lastSegment = segments[segments.length - 1]
    
    return lastSegment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }, [location.pathname])

  return (
    <div className="flex h-screen bg-surface-warm overflow-hidden">
      <SkipToContentLink />
      <Sidebar items={sidebarItems} logo={logo} user={user} onLogout={onLogout} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar pageTitle={pageTitle} />
        
        <main id="main-content" className="flex-1 overflow-y-auto outline-none" tabIndex={-1}>
          <div className="mx-auto max-w-7xl p-4 lg:p-8">
            <DashboardErrorBoundary key={location.pathname}>
              <React.Suspense fallback={
                <div className="flex items-center justify-center h-64">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-warm border-t-brand-orange-accessible" />
                </div>
              }>
                <Outlet />
              </React.Suspense>
            </DashboardErrorBoundary>
          </div>
        </main>
      </div>
      
      <Toaster />
      <CommandPalette />
    </div>
  )
}
