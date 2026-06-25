import { useNavigate } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import { useSidebarStore } from '../../hooks/useSidebarStore'
import { useCommandPaletteStore } from '../../hooks/useCommandPalette'
import { Button } from '../ui/Button'
import { NotificationCenter } from '../utilities/NotificationCenter'
import { useAuth } from '../../hooks/useAuth'

interface TopBarProps {
  pageTitle?: string
}

export function TopBar({ pageTitle }: TopBarProps) {
  const { toggle } = useSidebarStore()
  const { open } = useCommandPaletteStore()
  const { user, setRole } = useAuth()
  const navigate = useNavigate()

  const currentRoleVal = React.useMemo(() => {
    if (!user) return 'student';
    if (user.role === 'admin') {
      if (user.permissions?.includes('*')) return 'admin';
      return 'sub_admin';
    }
    return user.role;
  }, [user])

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border-warm bg-surface-card px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden text-brand-navy" onClick={toggle} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        {pageTitle && (
          <h1 className="font-display text-sm sm:text-base md:text-lg font-bold text-brand-navy truncate max-w-[100px] sm:max-w-xs md:max-w-none">
            {pageTitle}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Role Switcher for Auditing */}
        <select
          value={currentRoleVal}
          onChange={(e) => {
            const val = e.target.value
            if (val === 'sub_admin') {
              setRole('admin', [
                'universities.view',
                'courses.view',
                'intakes.view',
                'students.view',
                'agents.view',
                'applications.view',
              ])
              navigate('/portal/admin')
            } else {
              setRole(val as any)
              navigate(`/portal/${val}`)
            }
          }}
          className="mr-2 text-xs border border-border-warm bg-surface-warm rounded p-1.5 font-semibold text-brand-navy focus:outline-none"
          aria-label="Switch User Portal Role"
        >
          <option value="student">Student Portal</option>
          <option value="agent">Agent Portal</option>
          <option value="admin">Super Admin Portal</option>
          <option value="sub_admin">Sub-Admin Portal (Limited)</option>
        </select>

        <Button 
          variant="ghost" 
          className="hidden md:flex text-muted-foreground justify-start w-48 border border-border-warm bg-surface-warm hover:bg-surface-warm/80 hover:text-brand-navy" 
          onClick={open}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="text-xs">Search...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border-warm bg-surface-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        
        <Button variant="ghost" size="icon" className="lg:hidden text-brand-navy" onClick={open} aria-label="Search">
          <Search className="h-5 w-5" />
        </Button>

        <NotificationCenter />
      </div>
    </header>
  )
}
