import * as React from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useSidebarStore } from '../../hooks/useSidebarStore'
import { UserAvatar } from '../ui/Avatar'
import { Button } from '../ui/Button'

export interface NavItem {
  group?: string | null
  label: string
  icon: React.ElementType
  path: string
  permission?: string // For admin portal usage later
}

interface SidebarProps {
  items: NavItem[]
  logo: string | React.ReactNode
  user: {
    name: string
    role: string
    avatar?: string
    tier?: string // For agents
    referralCode?: string // For agents
  }
  onLogout: () => void
}

export function Sidebar({ items, logo, user, onLogout }: SidebarProps) {
  const { isOpen, close } = useSidebarStore()

  // Group items
  const groupedItems = React.useMemo(() => {
    const map = new Map<string, NavItem[]>()
    items.forEach(item => {
      const group = item.group || 'GENERAL'
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(item)
    })
    return Array.from(map.entries())
  }, [items])

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen w-[260px] flex-col bg-brand-navy transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Main navigation"
      >
        {/* Logo Area */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/10 shrink-0">
          {typeof logo === 'string' ? (
            logo.startsWith('http') || logo.startsWith('/') || logo.startsWith('data:') ? (
              <img src={logo} alt="TGA Logo" className="h-8 object-contain brightness-0 invert" />
            ) : (
              <span className="font-display font-black text-white text-lg tracking-wider">
                {logo}
              </span>
            )
          ) : (
            logo
          )}
          <Button variant="ghost" size="icon" className="text-white/70 hover:bg-white/10 lg:hidden" onClick={close}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin scrollbar-thumb-white/10">
          {groupedItems.map(([groupName, groupItems]) => (
            <div key={groupName}>
              {groupName !== 'GENERAL' && (
                <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                  {groupName}
                </h4>
              )}
              <ul className="space-y-1">
                {groupItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={() => close()}
                      end={item.path === '/student/' || item.path === '/agent/' || item.path === '/admin/'}
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive 
                          ? "bg-brand-orange-accessible/20 text-brand-orange-accessible border-l-2 border-brand-orange-accessible" 
                          : "text-white/70 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name} image={user.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-white/50 truncate">{user.role}</p>
              {user.tier && <p className="text-[10px] uppercase text-brand-orange-accessible font-bold mt-0.5">{user.tier}</p>}
            </div>
            <Button variant="ghost" size="icon" className="text-white/50 hover:bg-white/10 hover:text-white shrink-0" onClick={onLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          {user.referralCode && (
            <div className="mt-4 rounded bg-white/5 px-3 py-2 text-center text-xs">
              <span className="text-white/60">Referral Code:</span>{' '}
              <span className="font-mono font-medium text-brand-orange-accessible">{user.referralCode}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
