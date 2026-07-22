import { create } from 'zustand'
import {
  clearAuthSession,
  fetchAgentProfile,
  fetchStudentProfile,
  logoutRequest,
  refreshAuthSession,
  setUnauthorizedHandler,
  type AuthSessionResult,
  type AuthUser,
} from '../../lib/api'
import { useStore } from '../../hooks/useStore'

export type Role = 'student' | 'agent' | 'admin'
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface User {
  id: string
  publicId?: string
  name: string
  email: string
  role: Role
  avatar?: string
  tier?: number
  referralCode?: string
  permissions?: string[]
  isSuperAdmin?: boolean
  status?: string
  agentStatus?: string
  mustChangePassword?: boolean
}

interface AuthState {
  status: AuthStatus
  isLoading: boolean
  isAuthenticated: boolean
  user: User | null
  token: string | null
  sessionExpired: boolean
  restoreSession: () => Promise<void>
  establishSession: (session: AuthSessionResult) => Promise<void>
  clearSession: (sessionExpired?: boolean) => void
  logout: () => Promise<void>
  updateAgentStatus: (status: string) => void
  updateMustChangePassword: (value: boolean) => void
  updateAvatar: (thumbUrl: string | null) => void
  acknowledgeSessionExpired: () => void
}

let restorePromise: Promise<void> | null = null

function normalizeRole(rawRole: string | undefined): Role {
  if (rawRole === 'admin' || rawRole === 'super_admin') return 'admin'
  if (rawRole === 'agent' || rawRole === 'sub_agent') return 'agent'
  return 'student'
}

function normalizePermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return []
  return permissions.filter((permission): permission is string => typeof permission === 'string')
}

function mapAuthUser(apiUser: AuthUser): User {
  const firstName = apiUser.firstName ?? ''
  const lastName = apiUser.lastName ?? ''
  const fallbackName = `${firstName} ${lastName}`.trim() || apiUser.email
  const rawRole = apiUser.role ?? apiUser.user_type ?? apiUser.utype

  const isSuperAdmin = apiUser.is_super_admin === true || normalizePermissions(apiUser.permissions).includes('*')

  return {
    id: apiUser.public_id,
    publicId: apiUser.public_id,
    name: apiUser.name || fallbackName,
    email: apiUser.email,
    role: normalizeRole(rawRole),
    avatar: apiUser.avatar_thumb_url ?? undefined,
    permissions: isSuperAdmin ? ['*'] : normalizePermissions(apiUser.permissions),
    isSuperAdmin,
    status: apiUser.status,
    agentStatus: apiUser.account_status,
    mustChangePassword: apiUser.must_change_password === true,
    tier: typeof apiUser.tier === 'number' ? apiUser.tier : undefined,
    referralCode: apiUser.referral_code ?? undefined,
  }
}

function syncLegacyCurrentUser(apiUser: AuthUser | null): void {
  if (!apiUser) {
    useStore.getState().setCurrentUser(null)
    return
  }

  useStore.getState().setCurrentUser({
    id: apiUser.public_id,
    email: apiUser.email,
    phone: apiUser.phone,
    role: (apiUser.role ?? apiUser.user_type ?? apiUser.utype ?? 'student') as
      | 'student'
      | 'agent'
      | 'sub_agent'
      | 'counsellor'
      | 'visa_officer'
      | 'admin'
      | 'super_admin',
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    emailVerified: apiUser.emailVerified,
    createdAt: new Date().toISOString(),
    status:
      apiUser.status === 'suspended' ||
      apiUser.status === 'pending' ||
      apiUser.status === 'deleted'
        ? apiUser.status
        : 'active',
  })
}

function mapLegacyAgentTier(tier: number | string | undefined): 'bronze' | 'silver' | 'gold' {
  if (tier === 'gold' || tier === 'silver' || tier === 'bronze') return tier
  if (tier === 1 || tier === '1') return 'gold'
  if (tier === 2 || tier === '2') return 'silver'
  return 'bronze'
}

async function syncLegacyProfileCache(apiUser: AuthUser): Promise<void> {
  syncLegacyCurrentUser(apiUser)

  if (apiUser.role === 'student') {
    const profile = await fetchStudentProfile()
    useStore.getState().upsertStudentRecord({
      id: String(profile.public_id ?? `stud-${apiUser.public_id}`),
      userId: apiUser.public_id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      dob: profile.dob ?? undefined,
      nationality: profile.nationality ?? undefined,
      desiredCountry: profile.desired_country ?? undefined,
      desiredSubject: profile.desired_subject ?? undefined,
      budgetRange:
        profile.budget_min && profile.budget_max
          ? `${profile.budget_min}-${profile.budget_max} ${profile.budget_currency ?? 'USD'}`
          : undefined,
      profileCompletionPct: profile.profile_completion,
      gamificationPoints: profile.gamification_points,
    })
  }

  if (apiUser.role === 'agent' || apiUser.role === 'sub_agent') {
    if (apiUser.account_status === 'pending') {
      return
    }
    const profile = await fetchAgentProfile()
    useStore.getState().upsertAgentRecord({
      id: String(profile.public_id ?? `agent-${apiUser.public_id}`),
      userId: apiUser.public_id,
      agencyName: profile.agency_name,
      agencyCountry: profile.agency_country ?? profile.country ?? '',
      registrationNumber: profile.registration_number ?? '',
      partnershipType: profile.partnership_type ?? 'non_exclusive',
      tier: mapLegacyAgentTier(profile.tier),
      status:
        profile.status === 'inactive' || profile.status === 'rejected'
          ? 'suspended'
          : profile.status,
    })
  }
}

function applySessionState(
  set: (partial: Partial<AuthState>) => void,
  session: AuthSessionResult,
): void {
  set({
    status: 'authenticated',
    isLoading: false,
    isAuthenticated: true,
    user: mapAuthUser(session.user),
    token: session.accessToken,
    sessionExpired: false,
  })
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  isLoading: true,
  isAuthenticated: false,
  user: null,
  token: null,
  sessionExpired: false,

  restoreSession: async () => {
    if (get().status !== 'loading' && restorePromise === null) {
      return
    }

    if (restorePromise === null) {
      restorePromise = refreshAuthSession()
        .then((session) => get().establishSession(session))
        .catch(() => {
          clearAuthSession()
          syncLegacyCurrentUser(null)
          set({
            status: 'unauthenticated',
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
            sessionExpired: false,
          })
        })
        .finally(() => {
          restorePromise = null
        })
    }

    await restorePromise
  },

  establishSession: async (session) => {
    applySessionState(set, session)

    try {
      await syncLegacyProfileCache(session.user)
    } catch {
      syncLegacyCurrentUser(session.user)
    }
  },

  clearSession: (sessionExpired = false) => {
    clearAuthSession()
    syncLegacyCurrentUser(null)
    set({
      status: 'unauthenticated',
      isLoading: false,
      isAuthenticated: false,
      user: null,
      token: null,
      sessionExpired,
    })
  },

  logout: async () => {
    try {
      await logoutRequest()
    } finally {
      get().clearSession(false)
    }
  },

  // Keeps RoleGuard's redirect decisions in sync immediately after an
  // onboarding draft-save/submit, without waiting for the next full
  // session restore. The onboarding endpoints return the new status
  // directly, so there's no need to re-fetch the profile.
  updateAgentStatus: (status) => {
    const current = get().user
    if (!current) return
    set({ user: { ...current, agentStatus: status } })
  },

  // Lets AgentProfilePage release RoleGuard's forced-password-change redirect the instant
  // the change succeeds, without waiting for the next full session restore.
  updateMustChangePassword: (value) => {
    const current = get().user
    if (!current) return
    set({ user: { ...current, mustChangePassword: value } })
  },

  // Lets the profile page push a fresh avatar into the topbar/sidebar the instant it
  // changes, without waiting for the next full session restore / auth/me refetch.
  updateAvatar: (thumbUrl) => {
    const current = get().user
    if (!current) return
    set({ user: { ...current, avatar: thumbUrl ?? undefined } })
  },

  // Lets the login page show a one-time "session expired" toast after a forced
  // logout, then clear the flag so it doesn't reappear on a normal future logout.
  acknowledgeSessionExpired: () => set({ sessionExpired: false }),
}))

setUnauthorizedHandler(() => {
  useAuth.getState().clearSession(true)
})
