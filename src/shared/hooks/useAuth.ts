import { create } from 'zustand'

export type Role = 'student' | 'agent' | 'admin' | 'super_admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string
  tier?: string
  referralCode?: string
  permissions?: string[]
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  setRole: (role: Role, permissions?: string[]) => void
}

const SUPER_ADMIN_PERMISSIONS = ['*']
const SUB_ADMIN_PERMISSIONS = [
  'universities.view',
  'courses.view',
  'intakes.view',
  'students.view',
  'agents.view',
  'applications.view',
]

// Retrieve initial state from localStorage if available
const getInitialState = () => {
  try {
    const storedUser = localStorage.getItem('tga_auth_user')
    const storedToken = localStorage.getItem('tga_auth_token')
    const storedAuth = localStorage.getItem('tga_auth_authenticated')

    if (storedUser && storedToken && storedAuth === 'true') {
      return {
        isAuthenticated: true,
        user: JSON.parse(storedUser) as User,
        token: storedToken,
      }
    }
  } catch (e) {
    console.error('Error reading auth state from localStorage:', e)
  }

  // Default initial state
  return {
    isAuthenticated: true,
    user: {
      id: 'admin-1',
      name: 'Amit Tiwari (Super Admin)',
      email: 'amit@theglobalavenues.com',
      role: 'admin' as Role,
      permissions: SUPER_ADMIN_PERMISSIONS,
    },
    token: 'dummy_token',
  }
}

const initialState = getInitialState()

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: initialState.isAuthenticated, 
  user: initialState.user,
  token: initialState.token,
  
  login: (user, token) => {
    try {
      localStorage.setItem('tga_auth_user', JSON.stringify(user))
      localStorage.setItem('tga_auth_token', token)
      localStorage.setItem('tga_auth_authenticated', 'true')
    } catch (e) {
      console.error('Error writing auth state to localStorage:', e)
    }
    set({ isAuthenticated: true, user, token })
  },
  
  logout: () => {
    try {
      localStorage.removeItem('tga_auth_user')
      localStorage.removeItem('tga_auth_token')
      localStorage.removeItem('tga_auth_authenticated')
    } catch (e) {
      console.error('Error clearing auth state from localStorage:', e)
    }
    set({ isAuthenticated: false, user: null, token: null })
  },
  
  setRole: (role, permissions) => set((state) => {
    let userName = 'Amit Tiwari'
    let userPermissions = permissions || []
    
    if (role === 'admin') {
      userName = 'Amit Tiwari (Super Admin)'
      userPermissions = SUPER_ADMIN_PERMISSIONS
    } else if (role === 'super_admin') {
      userName = 'Amit Tiwari (Super Admin)'
      userPermissions = SUPER_ADMIN_PERMISSIONS
    } else if (role === 'agent') {
      userName = 'Global Education Partners'
    } else if (role === 'student') {
      userName = 'Amit Tiwari (Student)'
    } else {
      userName = 'Sarah Sub-Admin'
      userPermissions = SUB_ADMIN_PERMISSIONS
    }

    const updatedUser: User = {
      id: role === 'agent' ? 'agent-1' : role === 'student' ? 'student-1' : 'staff-1',
      name: userName,
      email: 'amit@example.com',
      role: role === 'super_admin' ? 'admin' : (role === 'admin' ? 'admin' : role),
      permissions: userPermissions,
      tier: role === 'agent' ? 'Level 1 Agent' : undefined,
      referralCode: role === 'agent' ? 'TGA-AG-2026' : undefined,
    }

    try {
      localStorage.setItem('tga_auth_user', JSON.stringify(updatedUser))
    } catch (e) {
      console.error('Error saving updated role to localStorage:', e)
    }

    return { user: updatedUser }
  })
}))
