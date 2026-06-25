import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, FileText, User, Settings, CreditCard, 
  Users, FolderOpen, Globe, BookOpen, Calendar, Handshake, 
  Target, Megaphone, BarChart2, Key, Activity, Lock, Network, DollarSign, UserCheck, Bell
} from 'lucide-react'
import { DashboardLayout } from './DashboardLayout'
import { useAuth } from '../../hooks/useAuth'
import type { NavItem } from './Sidebar'

const STUDENT_NAV: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard, path: '/portal/student' },
  { label: 'Applications', icon: FileText, path: '/portal/student/applications' },
  { label: 'Documents', icon: FolderOpen, path: '/portal/student/documents' },
  { label: 'My Agent', icon: UserCheck, path: '/portal/student/agent' },
  { label: 'Notices', icon: Bell, path: '/portal/student/notices' },
  { label: 'Profile', icon: User, path: '/portal/student/profile' },
]

const AGENT_NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/portal/agent' },
  { label: 'My Team', icon: Network, path: '/portal/agent/team' },
  { label: 'Students', icon: Users, path: '/portal/agent/students' },
  { label: 'Applications', icon: FileText, path: '/portal/agent/applications' },
  { label: 'Commissions', icon: DollarSign, path: '/portal/agent/commissions' },
  { label: 'Notices', icon: Bell, path: '/portal/agent/notices' },
  { label: 'Profile', icon: User, path: '/portal/agent/profile' },
]

const ADMIN_NAV_BASE: (NavItem & { permission?: string })[] = [
  { label: 'Overview', icon: LayoutDashboard, path: '/portal/admin' },
  { label: 'Universities', icon: Globe, path: '/portal/admin/universities', permission: 'universities.view' },
  { label: 'Courses', icon: BookOpen, path: '/portal/admin/courses', permission: 'courses.view' },
  { label: 'Intakes', icon: Calendar, path: '/portal/admin/intakes', permission: 'intakes.view' },
  { label: 'Students', icon: Users, path: '/portal/admin/students', permission: 'students.view' },
  { label: 'Agents', icon: Handshake, path: '/portal/admin/agents', permission: 'agents.view' },
  { label: 'Applications', icon: FileText, path: '/portal/admin/applications', permission: 'applications.view' },
  { label: 'Commissions', icon: DollarSign, path: '/portal/admin/commissions', permission: 'commissions.view' },
  { label: 'Leads', icon: Target, path: '/portal/admin/leads', permission: 'leads.view' },
  { label: 'Notices', icon: Megaphone, path: '/portal/admin/notices', permission: 'notices.view' },
  { label: 'Reports', icon: BarChart2, path: '/portal/admin/reports', permission: 'reports.view' },
  { label: 'Users', icon: Users, path: '/portal/admin/users', permission: 'users.view' },
  { label: 'Roles', icon: Key, path: '/portal/admin/roles', permission: 'roles.view' },
  { label: 'Settings', icon: Settings, path: '/portal/admin/settings', permission: 'settings.view' },
  { label: 'Logs', icon: Activity, path: '/portal/admin/logs', permission: 'logs.view' },
  { label: 'Security', icon: Lock, path: '/portal/admin/security', permission: 'security.view' },
]

export function PortalWrapper() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  let navItems: NavItem[] = []
  
  if (user.role === 'student') navItems = STUDENT_NAV
  if (user.role === 'agent') navItems = AGENT_NAV
  if (user.role === 'admin') {
    // Filter admin nav based on permissions
    navItems = ADMIN_NAV_BASE.filter(item => {
      if (!item.permission) return true;
      return user.permissions?.includes('*') || user.permissions?.includes(item.permission) || false;
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Inject agent-specific props if the user is an agent
  const agentProps = user.role === 'agent' ? {
    tier: 'Level 1 Agent',
    referralCode: 'TGA-AG-2026'
  } : {};

  return (
    <DashboardLayout
      logo="GLOBAL AVENUES"
      user={user}
      sidebarItems={navItems}
      onLogout={handleLogout}
      {...agentProps}
    />
  )
}
