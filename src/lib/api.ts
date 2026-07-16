const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost/crm-api';

type ApiError = {
  success: false;
  message: string;
  code: string;
  errors?: Record<string, string>;
};

type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let refreshPromise: Promise<boolean> | null = null;
let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

// Codes raised by AuthMiddleware for a dead/expired/revoked token or session.
// Only these should trigger the silent refresh-and-retry (or forced logout if
// that refresh fails) — business-logic 401s (bad password, bad OTP) use other
// codes and must be left alone so they just surface as a normal form error.
const SESSION_ERROR_CODES = new Set([
  'AUTH_TOKEN_MISSING',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_INVALID',
  'SESSION_REVOKED',
  'ACCOUNT_INACTIVE',
]);

export function getAccessToken(): string | null {
  return accessToken;
}

/** Registered by useAuth — called once a refresh-on-401 attempt has also failed,
 * meaning the session is truly over (not just the access token being stale). */
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

function decodeJwtExpiry(token: string): number | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    const decoded = JSON.parse(json) as { exp?: number };
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
}

function clearProactiveRefresh(): void {
  if (proactiveRefreshTimer !== null) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

// Silently renews the access token well before it expires so an open tab
// never actually hits a 401 mid-task. If the tab was asleep/throttled and
// this timer is missed, the reactive refresh-on-401 path below still covers it.
function scheduleProactiveRefresh(token: string): void {
  clearProactiveRefresh();
  const exp = decodeJwtExpiry(token);
  if (exp === null) return;

  const msRemaining = exp * 1000 - Date.now();
  if (msRemaining <= 0) return;

  const delay = Math.max(msRemaining * 0.75, 5_000);
  proactiveRefreshTimer = setTimeout(() => {
    void refreshAccessTokenOnce();
  }, delay);
}

function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    scheduleProactiveRefresh(token);
  } else {
    clearProactiveRefresh();
  }
}

function refreshAccessTokenOnce(): Promise<boolean> {
  if (refreshPromise === null) {
    refreshPromise = refreshAuthSession()
      .then(() => true)
      .catch(() => {
        // The refresh token itself is dead (expired/revoked/missing) — the session is
        // unrecoverable. Terminate it immediately rather than waiting for the next
        // user-triggered request to discover the same thing via a stale access token.
        setAccessToken(null);
        unauthorizedHandler?.();
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<ApiSuccess<T>> {
  const headers = new Headers(init.headers ?? {});
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

  if (!headers.has('Content-Type') && init.body !== undefined && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken !== null) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const rawPayload = await response.json();
  const payload =
    rawPayload && typeof rawPayload === 'object'
      ? ('data' in rawPayload
          ? rawPayload
          : {
              success: rawPayload.success !== false,
              message: typeof rawPayload.message === 'string' ? rawPayload.message : '',
              data: rawPayload,
              meta: typeof rawPayload.meta === 'object' ? rawPayload.meta : undefined,
            })
      : { success: false, message: 'Request failed', code: 'INVALID_RESPONSE' };

  if (!response.ok || payload.success === false) {
    const error = payload as ApiError;
    const isSessionError = response.status === 401 && SESSION_ERROR_CODES.has(error.code);
    const isRefreshEndpoint = path.includes('action=refresh');

    if (isSessionError && !isRetry && !isRefreshEndpoint && accessToken !== null) {
      const refreshed = await refreshAccessTokenOnce();
      if (refreshed) {
        return request<T>(path, init, true);
      }
    }

    if (isSessionError) {
      setAccessToken(null);
      unauthorizedHandler?.();
    }

    const message = error.message || 'Request failed';
    throw new ApiRequestError(message, error.code ?? 'UNKNOWN_ERROR', response.status, payload);
  }

  return payload as ApiSuccess<T>;
}

function extractAccessToken(data: Record<string, unknown>): string {
  const token = data.accessToken ?? data.access_token;
  if (typeof token !== 'string' || token === '') {
    throw new Error('Authentication token missing from response');
  }
  return token;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    query.set(key, String(value));
  });

  return query.toString();
}

export type AuthUser = {
  id: number;
  public_id: string;
  email: string;
  phone?: string;
  role: string;
  user_type?: string;
  utype?: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  firstName: string;
  lastName: string;
  name?: string;
  permissions?: string[];
  is_super_admin?: boolean;
  account_status?: string;
  two_factor_enabled?: boolean;
  tier?: number | null;
  referral_code?: string | null;
  avatar_url?: string | null;
  avatar_thumb_url?: string | null;
};

export type StudentProfileResponse = {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  dob?: string | null;
  nationality?: string | null;
  desired_country?: string | null;
  desired_subject?: string | null;
  desired_degree_level?: string | null;
  budget_min?: string | null;
  budget_max?: string | null;
  budget_currency?: string | null;
  career_goal?: string | null;
  gamification_points: number;
  profile_completion: number;
  avatar_url?: string | null;
  avatar_thumb_url?: string | null;
};

export type AgentProfileResponse = {
  public_id: string;
  full_name: string;
  agency_name: string;
  tier: number;
  referral_code: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'inactive';
  country: string | null;
  created_at: string;
  pending_student_requests?: number;
  avatar_url?: string | null;
  avatar_thumb_url?: string | null;
};

export type AdminProfileResponse = {
  public_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_name: string;
  is_super_admin: boolean;
  two_factor_enabled: boolean;
  created_at: string;
  avatar_url?: string | null;
  avatar_thumb_url?: string | null;
};

export type AvatarUpdateResponse = {
  avatar_type: 'preset' | 'upload' | null;
  avatar_url: string | null;
  avatar_thumb_url: string | null;
};

export type CatalogUniversity = {
  id: string;
  public_id: string;
  name: string;
  shortName: string | null;
  country: string;
  city: string | null;
  partnershipType: 'exclusive' | 'non_exclusive';
  isExclusive: boolean;
  programCount: number;
  /** Total campuses in this institution's group, including this one (always >= 1). */
  campusCount: number;
  startingTuition: number | null;
  startingTuitionCurrency: string | null;
  startingTuitionLabel: string | null;
  logoUrl: string | null;
  logoThumbUrl: string | null;
};

export type CatalogCampus = {
  id: string;
  public_id: string;
  name: string;
  city: string | null;
  country: string;
  programCount: number;
  logoUrl: string | null;
  logoThumbUrl: string | null;
};

export type CatalogProgram = {
  id: string;
  public_id: string;
  name: string;
  degreeLevel: string;
  subjectArea: string | null;
  tuitionFee: number | null;
  tuitionCurrency: string | null;
  tuitionLabel: string | null;
  intakeMonths: string[];
  university: {
    id: string;
    public_id: string;
    name: string;
    shortName: string | null;
    country: string;
    city: string | null;
    partnershipType: 'exclusive' | 'non_exclusive';
    isExclusive: boolean;
  };
};

export type AdminPermissionSummary = {
  role: string;
  allowedStages: string[];
  canManageCatalog: boolean;
  catalogReadOnly: boolean;
  canReviewDocuments: boolean;
  canManageUsers: boolean;
  canViewAgentDirectory: boolean;
  canChangeInternalRoles: boolean;
  canViewAuditLog: boolean;
  canApproveAgents: boolean;
};

export type AdminDashboardStats = {
  totalApplications: number;
  pendingAgentApprovals: number;
  pendingDocumentReviews: number;
  activeStudents: number;
  activeAgents: number;
  activeUniversities: number;
  activePrograms: number;
  applicationsByStage: Array<{ status: string; total: string | number }>;
  recentStageMovement: Array<{
    id: number;
    application_id: number;
    from_status: string | null;
    to_status: string;
    created_at: string;
    reference_number: string;
    student_name: string;
  }>;
  assignees: Array<{
    id: number;
    email: string;
    role: string;
    status: string;
  }>;
  permissions: AdminPermissionSummary;
};

export type AdminPipelineItem = {
  id: string;
  reference_number: string;
  status: string;
  priority: string;
  intake_month: number;
  intake_year: number;
  assigned_to: number | null;
  is_flagged: boolean | number;
  flag_reason: string | null;
  created_at: string;
  updated_at: string;
  student_name: string;
  student_email: string;
  university_id: string;
  university_name: string;
  university_country: string;
  program_id: string;
  program_name: string;
  degree_level: string;
  agent_id: string | null;
  agency_name: string | null;
  assignee_email: string | null;
  document_count: number | string;
  latest_note_at: string | null;
};

export type AdminApplicationDetail = {
  id: string;
  public_id?: string;
  reference_number: string;
  student_user_id: number;
  agent_id: string | null;
  program_id: string;
  university_id: string;
  status: string;
  priority: string;
  intake_month: number;
  intake_year: number;
  assigned_to: number | null;
  is_flagged: boolean | number;
  flag_reason: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  nationality: string | null;
  desired_country: string | null;
  desired_subject: string | null;
  profile_completion: number | null;
  university_name: string;
  university_country: string;
  program_name: string;
  degree_level: string;
  agency_name: string | null;
  agent_email: string | null;
  assignee_email: string | null;
  documents: Array<{
    id: string;
    application_id: string;
    uploaded_by: number;
    document_type: string;
    file_name: string;
    file_path: string;
    file_size: number | null;
    mime_type: string | null;
    file_uuid: string;
    status: string;
    rejection_reason: string | null;
    verified_by: number | null;
    verified_at: string | null;
    created_at: string;
  }>;
  history: Array<{
    id: number;
    from_status: string | null;
    to_status: string;
    changed_by: number;
    note: string | null;
    created_at: string;
    changed_by_email: string | null;
  }>;
  notes: Array<{
    id: number;
    note: string;
    is_internal: boolean | number;
    created_at: string;
    author_id: number;
    author_email: string;
    author_role: string;
  }>;
};

export type AdminDocumentQueueItem = {
  id: string;
  application_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reference_number: string;
  application_status: string;
  student_name: string;
  student_email: string;
  university_name: string;
  program_name: string;
};

export type PageAccessLevel = 'read' | 'write';

export type AdminUserSummary = {
  public_id: string;
  email: string;
  phone: string | null;
  role: string;
  role_public_id: string | null;
  status: string;
  is_super_admin: boolean;
  created_at: string;
  last_login_at: string | null;
  firstName: string | null;
  lastName: string | null;
  pages: Record<string, PageAccessLevel>;
  avatar_url?: string | null;
  avatar_thumb_url?: string | null;
};

export type AdminUserDetail = {
  id: number;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
  profile: Record<string, unknown> | null;
};

export type AdminAgentSummary = {
  id: number;
  user_id: number;
  agency_name: string;
  agency_country: string;
  registration_number: string | null;
  partnership_type: 'exclusive' | 'non_exclusive';
  tier: 'bronze' | 'silver' | 'gold';
  status: string;
  approved_at: string | null;
  email: string;
  phone: string | null;
  user_status: string;
};

export type AdminUniversityRecord = {
  id: string;
  name: string;
  shortName: string | null;
  country: string;
  city: string | null;
  partnershipType: 'exclusive' | 'non_exclusive';
  isActive: boolean;
  programCount: number;
  createdAt: string;
  logoUrl: string | null;
  logoThumbUrl: string | null;
};

export type AdminProgramRecord = {
  id: string;
  universityId: string;
  universityName: string;
  name: string;
  degreeLevel: string;
  subjectArea: string | null;
  tuitionFee: number | null;
  tuitionCurrency: string | null;
  intakeMonths: string[];
  isActive: boolean;
  createdAt: string;
};

export type AuditLogEntry = {
  id: number;
  userId: number | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type ApplicationDetailResponse = {
  id: number;
  public_id?: string;
  reference_number: string;
  student_id?: number;
  student_user_id?: number;
  agent_id?: number | null;
  agent_id_at_submission?: number | null;
  sub_agent_id?: number | null;
  intake_id?: number;
  program_id?: number;
  university_id?: number;
  status: string;
  priority?: string;
  preference_rank?: number | null;
  created_by_type?: 'student' | 'agent' | 'admin';
  intake_month?: number;
  intake_year?: number;
  source?: string;
  notes?: string | null;
  withdrawal_reason?: string | null;
  submitted_at?: string | null;
  created_at: string;
  updated_at?: string;
  university_name?: string;
  program_name?: string;
  degree_level?: string;
  history?: Array<{
    id: number;
    from_status: string | null;
    to_status: string;
    changed_by: number;
    note: string | null;
    created_at: string;
  }>;
  documents?: Array<{
    id: number;
    document_type: string;
    file_name: string;
    file_path: string;
    file_size: number | null;
    mime_type: string | null;
    file_uuid?: string;
    status: string;
    created_at: string;
  }>;
};

export async function registerStudent(payload: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<void> {
  const response = await request<{ userId: number; role: string; accessToken: string }>(
    '/?route=auth&action=register',
    {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        role: 'student',
      }),
    }
  );

  setAccessToken(extractAccessToken(response.data as Record<string, unknown>));
}

export async function registerAgent(payload: {
  agency_name: string;
  agency_country: string;
  registration_number: string;
  email: string;
  phone: string;
  partnership_type: 'exclusive' | 'non_exclusive';
  password: string;
}): Promise<void> {
  const response = await request<{ userId: number; role: string; accessToken: string }>(
    '/?route=auth&action=register',
    {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        role: 'agent',
        first_name: 'Agency',
        last_name: 'Lead',
        agency_name: payload.agency_name,
        agency_country: payload.agency_country,
      }),
    }
  );

  setAccessToken(extractAccessToken(response.data as Record<string, unknown>));

  await updateAgentProfile({
    registration_number: payload.registration_number,
    partnership_type: payload.partnership_type,
  });
}


export type RegistrationOtpResult = {
  session_token: string;
  expires_in_minutes?: number;
};

export type AuthSessionResult = {
  user: AuthUser;
  accessToken: string;
  access_token?: string;
};

export async function sendRegistrationOtp(
  email: string,
  role: 'student' | 'agent',
  fullName: string,
  phone: string,
): Promise<RegistrationOtpResult> {
  const response = await request<RegistrationOtpResult>(
    '/?route=auth&action=register/send-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email, role, full_name: fullName, phone }),
    },
  );

  return response.data;
}

export async function verifyRegistrationOtp(sessionToken: string, otpCode: string): Promise<void> {
  await request(
    '/?route=auth&action=register/verify-otp',
    {
      method: 'POST',
      body: JSON.stringify({
        session_token: sessionToken,
        otp_code: otpCode,
      }),
    },
  );
}

export async function completeStudentRegistration(
  sessionToken: string,
  password: string,
): Promise<AuthSessionResult> {
  const response = await request<AuthSessionResult>(
    '/?route=auth&action=register/complete-student',
    {
      method: 'POST',
      body: JSON.stringify({
        session_token: sessionToken,
        password,
      }),
    },
  );

  setAccessToken(extractAccessToken(response.data as Record<string, unknown>));
  return {
    ...response.data,
    accessToken: extractAccessToken(response.data as Record<string, unknown>),
  };
}

export async function completeAgentRegistration(
  sessionToken: string,
  payload: { password: string },
): Promise<{ message: string; status?: string }> {
  const response = await request<{ message: string; status?: string }>(
    '/?route=auth&action=register/complete-agent',
    {
      method: 'POST',
      body: JSON.stringify({
        session_token: sessionToken,
        ...payload,
      }),
    },
  );

  return response.data;
}


export async function loginWithPassword(
  email: string,
  password: string,
  role?: 'student' | 'agent' | 'admin',
): Promise<AuthLoginResult> {
  const response = await request<{
    user?: AuthUser;
    accessToken?: string;
    access_token?: string;
    two_factor_required?: boolean;
    requires_2fa?: boolean;
    pre_auth_token?: string;
    account_status?: string;
    rejection_reason?: string;
    submitted_at?: string;
  }>(
    '/?route=auth&action=login',
    {
      method: 'POST',
      body: JSON.stringify(role ? { email, password, role } : { email, password }),
    }
  );

  if (response.data.accessToken || response.data.access_token) {
    setAccessToken(extractAccessToken(response.data as Record<string, unknown>));
  }

  return {
    user: response.data.user,
    accessToken: response.data.accessToken ?? response.data.access_token,
    twoFactorRequired: response.data.two_factor_required,
    requires2fa: response.data.requires_2fa ?? response.data.two_factor_required,
    preAuthToken: response.data.pre_auth_token,
    accountStatus: response.data.account_status,
    rejectionReason: response.data.rejection_reason,
    submittedAt: response.data.submitted_at,
    message: response.message,
  };
}

export async function requestOtpLogin(email: string, role: 'student' | 'agent'): Promise<void> {
  await request('/?route=auth&action=otp-login/request', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function verifyOtpLogin(
  email: string,
  otpCode: string,
  role: 'student' | 'agent',
): Promise<AuthLoginResult> {
  const response = await request<{
    user?: AuthUser;
    accessToken?: string;
    access_token?: string;
    account_status?: string;
    rejection_reason?: string;
  }>(
    '/?route=auth&action=otp-login/verify',
    {
      method: 'POST',
      body: JSON.stringify({ email, otp_code: otpCode, role }),
    }
  );

  if (response.data.accessToken || response.data.access_token) {
    setAccessToken(extractAccessToken(response.data as Record<string, unknown>));
  }

  return {
    user: response.data.user,
    accessToken: response.data.accessToken ?? response.data.access_token,
    accountStatus: response.data.account_status,
    rejectionReason: response.data.rejection_reason,
    message: response.message,
  };
}


export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>('/?route=auth&action=me');

  return response.data.user;
}

export async function fetchStudentProfile(): Promise<StudentProfileResponse> {
  const response = await request<{ profile: StudentProfileResponse }>('/?route=student&action=profile');

  return response.data.profile;
}

export async function updateStudentProfile(payload: Record<string, unknown>): Promise<StudentProfileResponse> {
  const response = await request<{ profile: StudentProfileResponse }>('/?route=student&action=profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data.profile;
}

export async function fetchAgentProfile(): Promise<AgentProfileResponse> {
  const response = await request<AgentProfileResponse>('/?route=agent&action=profile');

  return response.data;
}

export async function updateAgentProfile(payload: Record<string, unknown>): Promise<void> {
  await request('/?route=agent&action=profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminProfile(): Promise<AdminProfileResponse> {
  const response = await request<AdminProfileResponse>('/?route=admin&action=profile');
  return response.data;
}

export async function updateAdminProfile(payload: { full_name: string }): Promise<void> {
  await request('/?route=admin&action=profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function uploadAvatar(file: Blob): Promise<AvatarUpdateResponse> {
  const formData = new FormData();
  formData.set('avatar', file, 'avatar.jpg');
  const response = await request<AvatarUpdateResponse>('/?route=avatar&action=upload', {
    method: 'POST',
    body: formData,
  });
  return response.data;
}

export async function selectPresetAvatar(presetKey: string): Promise<AvatarUpdateResponse> {
  const response = await request<AvatarUpdateResponse>('/?route=avatar&action=select-preset', {
    method: 'POST',
    body: JSON.stringify({ preset_key: presetKey }),
  });
  return response.data;
}

export async function removeAvatar(): Promise<void> {
  await request('/?route=avatar&action=remove', { method: 'DELETE' });
}

export async function fetchUniversities(params: {
  page?: number;
  perPage?: number;
  q?: string;
  country?: string;
  subjectArea?: string;
  degreeLevel?: string;
} = {}): Promise<{ universities: CatalogUniversity[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'university',
    action: 'list',
    page: params.page,
    per_page: params.perPage,
    q: params.q,
    country: params.country,
    subject_area: params.subjectArea,
    degree_level: params.degreeLevel,
  });

  const response = await request<any[]>(`/?${query}`);
  const rows = (Array.isArray(response.data) ? response.data : []) as any[];

  return {
    universities: rows.map((row) => ({
      id: row.public_id,
      public_id: row.public_id,
      name: row.name,
      shortName: null,
      country: row.country,
      city: row.city,
      partnershipType: row.partnership_type,
      isExclusive: row.partnership_type === 'exclusive',
      programCount: row.course_count ?? 0,
      campusCount: row.campus_count ?? 1,
      startingTuition: null,
      startingTuitionCurrency: null,
      startingTuitionLabel: null,
      logoUrl: row.logo_url ?? null,
      logoThumbUrl: row.logo_thumb_url ?? null,
    })),
    meta: response.meta as PaginationMeta,
  };
}

// Campus-picker step: every campus row belonging to the same institution as universityPublicId
// (including itself). Always returns at least one item — a university with no sibling campuses
// still returns as a single-item list so the campus step never has to special-case "no group".
export async function fetchUniversityCampuses(universityPublicId: string): Promise<CatalogCampus[]> {
  const response = await request<{ campuses: any[] }>(
    `/?route=universities&action=${encodeURIComponent(universityPublicId)}/campuses`
  );
  const rows = response.data.campuses ?? [];
  return rows.map((row) => ({
    id: row.public_id,
    public_id: row.public_id,
    name: row.name,
    city: row.city,
    country: row.country,
    programCount: row.course_count ?? 0,
    logoUrl: row.logo_url ?? null,
    logoThumbUrl: row.logo_thumb_url ?? null,
  }));
}

export type UniversityDetailCourse = {
  public_id: string;
  name: string;
  degree_level: string;
  duration_months: number | null;
  language: string | null;
  description: string | null;
  open_intake_count: number;
  min_tuition_fee?: number | string | null;
  max_tuition_fee?: number | string | null;
  tuition_fee_currency?: string | null;
};

export async function fetchUniversityDetail(universityPublicId: string): Promise<any & { courses: UniversityDetailCourse[] }> {
  const response = await request<{ university: any }>(
    `/?route=universities&action=${encodeURIComponent(universityPublicId)}`
  );

  return response.data.university;
}

export async function fetchProgramIntakes(coursePublicId: string): Promise<any[]> {
  const response = await request<{ intakes: any[] }>(`/?route=courses&action=${encodeURIComponent(coursePublicId)}/intakes`);
  return response.data.intakes ?? [];
}

export async function createApplication(payload: {
  programId: string;
  universityId?: string;
  intakeId: string;
  source?: 'direct' | 'agent' | 'referral' | 'website';
  studentUserId?: string;
}): Promise<{ application: ApplicationDetailResponse; autoSubmitted: boolean }> {
  const response = await request<{ application: ApplicationDetailResponse; auto_submitted: boolean }>('/?route=application&action=create', {
    method: 'POST',
    body: JSON.stringify({
      program_id: payload.programId,
      intake_id: payload.intakeId,
    }),
  });

  return { application: response.data.application, autoSubmitted: response.data.auto_submitted };
}

export async function reorderApplicationPreferences(order: string[]): Promise<void> {
  await request('/?route=student&action=applications/reorder', {
    method: 'PUT',
    body: JSON.stringify({ order }),
  });
}

export async function agentCreateApplication(studentPid: string, intakePid: string, notes?: string): Promise<{ application: ApplicationDetailResponse; autoSubmitted: boolean }> {
  const response = await request<{ application: ApplicationDetailResponse; auto_submitted: boolean }>('/?route=agent&action=applications', {
    method: 'POST',
    body: JSON.stringify({ student_pid: studentPid, intake_pid: intakePid, notes }),
  });

  return { application: response.data.application, autoSubmitted: response.data.auto_submitted };
}

export async function agentSubmitApplication(applicationPublicId: string): Promise<void> {
  await request(`/?route=agent&action=applications/${encodeURIComponent(applicationPublicId)}/submit`, { method: 'PUT' });
}

export function clearAuthSession(): void {
  setAccessToken(null);
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const response = await request<{ stats: AdminDashboardStats }>('/?route=admin&action=get_dashboard_stats');

  return response.data.stats;
}

// NOTE: fetchAdminPipeline / fetchAdminApplicationDetail / updateAdminApplication are legacy-shaped
// adapters kept for AdminDashboardPage.tsx's pipeline widget. They call the same real
// ApplicationController endpoints as the primary fetchAdminApplications/updateAdminApplicationStatus
// functions below and reshape the response into the AdminPipelineItem/AdminApplicationDetail types.
// Fields that don't exist in the real schema (priority, assigned_to, is_flagged, source) are
// display-only defaults — there is no backend column to persist them.
export async function fetchAdminPipeline(params: {
  page?: number;
  perPage?: number;
  q?: string;
  status?: string;
} = {}): Promise<{ applications: AdminPipelineItem[]; meta: PaginationMeta }> {
  const response = await api.get<any[]>('admin/applications', {
    params: { page: params.page, per_page: params.perPage, status: params.status },
  });
  const rows = (Array.isArray(response.data) ? response.data : []) as any[];
  const q = (params.q ?? '').toLowerCase();
  const filtered = q
    ? rows.filter((row) =>
        [row.student_name, row.university_name, row.course_name, row.reference_number]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(q))
      )
    : rows;

  const applications: AdminPipelineItem[] = filtered.map((row) => ({
    id: row.public_id,
    reference_number: row.reference_number,
    status: row.status,
    priority: 'normal',
    intake_month: row.intake_month,
    intake_year: row.intake_year,
    assigned_to: null,
    is_flagged: false,
    flag_reason: null,
    created_at: row.created_at,
    updated_at: row.created_at,
    student_name: row.student_name,
    student_email: '',
    university_id: row.university_name,
    university_name: row.university_name,
    university_country: '',
    program_id: row.course_name,
    program_name: row.course_name,
    degree_level: row.course_level,
    agent_id: row.agent_name ? row.agent_name : null,
    agency_name: row.agent_name ?? null,
    assignee_email: null,
    document_count: 0,
    latest_note_at: null,
  }));

  return { applications, meta: response.meta as PaginationMeta };
}

export async function fetchAdminApplicationDetail(applicationPublicId: string): Promise<AdminApplicationDetail> {
  const response = await api.get<{ application: any }>(`admin/applications/${encodeURIComponent(applicationPublicId)}`);
  const app = response.data.application;

  return {
    id: app.public_id,
    public_id: app.public_id,
    reference_number: app.reference_number,
    student_user_id: 0,
    agent_id: null,
    program_id: app.course_name,
    university_id: app.university_name,
    status: app.status,
    priority: 'normal',
    intake_month: app.intake_month,
    intake_year: app.intake_year,
    assigned_to: null,
    is_flagged: false,
    flag_reason: null,
    source: 'website',
    created_at: app.created_at,
    updated_at: app.created_at,
    student_name: app.student_name,
    student_email: '',
    student_phone: null,
    nationality: null,
    desired_country: null,
    desired_subject: null,
    profile_completion: null,
    university_name: app.university_name,
    university_country: '',
    program_name: app.course_name,
    degree_level: app.course_level,
    agency_name: app.agent_name ?? null,
    agent_email: null,
    assignee_email: null,
    documents: (app.document_requests ?? []).map((d: any) => ({
      id: d.public_id,
      application_id: app.public_id,
      uploaded_by: 0,
      document_type: d.doc_label,
      file_name: d.doc_label,
      file_path: '',
      file_size: null,
      mime_type: null,
      file_uuid: d.public_id,
      status: d.status,
      rejection_reason: d.rejection_reason ?? null,
      verified_by: null,
      verified_at: null,
      created_at: app.created_at,
    })),
    history: (app.timeline ?? [])
      .filter((t: any) => t.item_type === 'status_change')
      .map((t: any, idx: number) => ({
        id: idx,
        from_status: null,
        to_status: app.status,
        changed_by: 0,
        note: t.content,
        created_at: t.created_at,
        changed_by_email: null,
      })),
    notes: (app.timeline ?? []).map((t: any, idx: number) => ({
      id: idx,
      note: t.content,
      is_internal: !t.is_visible_to_agent,
      created_at: t.created_at,
      author_id: 0,
      author_email: '',
      author_role: t.direction,
    })),
  } as unknown as AdminApplicationDetail;
}

export async function updateAdminApplication(payload: {
  application_id: string;
  status?: string;
  priority?: string;
  assigned_to?: number | null;
  note?: string;
  is_flagged?: boolean;
  flag_reason?: string;
}): Promise<AdminApplicationDetail> {
  if (payload.status) {
    await api.post(`admin/applications/${encodeURIComponent(payload.application_id)}/status`, {
      status: payload.status,
      note: payload.note,
    });
  }
  return fetchAdminApplicationDetail(payload.application_id);
}

export async function fetchAdminDocumentQueue(params: {
  page?: number;
  perPage?: number;
  q?: string;
  status?: string;
} = {}): Promise<{ documents: AdminDocumentQueueItem[]; meta: PaginationMeta }> {
  const response = await api.get<{ queue: any[] }>('admin/get_document_queue', {
    params: { status: params.status, per_page: params.perPage },
  });
  const rows = response.data.queue ?? [];

  const documents: AdminDocumentQueueItem[] = rows.map((row: any) => ({
    id: row.public_id,
    application_id: row.application_pid,
    document_type: row.doc_label,
    file_name: row.file_name ?? row.doc_label,
    file_path: '',
    file_size: null,
    mime_type: null,
    status: row.status,
    rejection_reason: null,
    created_at: row.created_at,
    reference_number: row.application_reference,
    application_status: row.status,
    student_name: row.student_name,
    student_email: row.student_email,
    university_name: '',
    program_name: '',
  }));

  return {
    documents,
    meta: { current_page: 1, per_page: documents.length || 1, total: documents.length, total_pages: 1, has_next: false, has_prev: false },
  };
}

export type AdminPaymentQueueItem = {
  public_id: string;
  label: string;
  amount: number | null;
  currency: string | null;
  due_date: string | null;
  status: string;
  marked_paid_at: string | null;
  application_pid: string;
  application_reference: string;
  student_name: string;
};

export async function fetchAdminPaymentQueue(): Promise<AdminPaymentQueueItem[]> {
  const response = await api.get<{ queue: AdminPaymentQueueItem[] }>('admin/get_payment_queue');
  return response.data.queue ?? [];
}

export type AdminAgentQueueItem = {
  public_id: string;
  tier: number;
  agency_name: string;
  country: string | null;
  status: string;
  email: string | null;
};

export async function fetchAdminAgentQueue(): Promise<AdminAgentQueueItem[]> {
  const response = await api.get<{ queue: AdminAgentQueueItem[] }>('admin/get_agent_queue');
  return response.data.queue ?? [];
}

export async function reviewAdminDocument(payload: {
  document_id: string;
  decision: 'verified' | 'rejected';
  reason?: string;
}): Promise<AdminDocumentQueueItem> {
  const response = await api.post<{ document_request: any }>('admin/review_document', payload);
  const d = response.data.document_request;

  return {
    id: d.public_id,
    application_id: '',
    document_type: d.doc_label,
    file_name: d.doc_label,
    file_path: '',
    file_size: null,
    mime_type: null,
    status: d.status,
    rejection_reason: d.rejection_reason ?? null,
    created_at: '',
    reference_number: '',
    application_status: '',
    student_name: '',
    student_email: '',
    university_name: '',
    program_name: '',
  } as unknown as AdminDocumentQueueItem;
}

export async function fetchAdminUsers(params: {
  page?: number;
  perPage?: number;
  q?: string;
  role?: string;
  status?: string;
} = {}): Promise<{ users: AdminUserSummary[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'admin',
    action: 'get_users',
    page: params.page,
    per_page: params.perPage,
    q: params.q,
    role: params.role,
    status: params.status,
  });

  const response = await request<{ users: AdminUserSummary[] }>(`/?${query}`);

  return {
    users: response.data.users,
    meta: response.meta as PaginationMeta,
  };
}

export async function fetchAdminUserDetail(userId: number): Promise<AdminUserDetail> {
  const query = buildQuery({
    route: 'admin',
    action: 'get_user_detail',
    id: userId,
  });

  const response = await request<{ user: AdminUserDetail }>(`/?${query}`);

  return response.data.user;
}

export async function updateAdminUser(payload: {
  public_id: string;
  status?: string;
  role?: string;
  pages?: Record<string, PageAccessLevel>;
}): Promise<void> {
  await request('/?route=admin&action=update_user', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminAgents(params: {
  page?: number;
  perPage?: number;
  q?: string;
  tier?: string;
  status?: string;
} = {}): Promise<{ agents: any[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'admin',
    action: 'agents',
    page: params.page,
    per_page: params.perPage,
    search: params.q,
    tier: params.tier,
    status: params.status,
  });

  const response = await request<any>(`/?${query}`);

  return {
    agents: response.data.agents || response.data || [],
    meta: (response.meta || response.data.meta) as PaginationMeta,
  };
}

export async function approveAdminAgent(publicId: string): Promise<{ referral_code: string }> {
  const response = await request<{ referral_code: string }>(
    `/?route=admin&action=agents/${encodeURIComponent(publicId)}/approve`,
    { method: 'POST' }
  );
  return response.data;
}

export async function rejectAdminAgent(publicId: string, reason?: string): Promise<void> {
  await request(`/?route=admin&action=agents/${encodeURIComponent(publicId)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? '' }),
  });
}

export async function suspendAdminAgent(publicId: string, reason: string): Promise<void> {
  await request(`/?route=admin&action=agents/${encodeURIComponent(publicId)}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function fetchAdminAgentsRegistered(): Promise<{ agents: any[] }> {
  const response = await request<{ agents: any[] }>('/?route=admin&action=agents/registered');
  return { agents: response.data.agents ?? [] };
}

export async function fetchAdminAgentsDrafts(): Promise<{ agents: any[] }> {
  const response = await request<{ agents: any[] }>('/?route=admin&action=agents/drafts');
  return { agents: response.data.agents ?? [] };
}

export async function fetchAdminAgentsPending(): Promise<{ agents: any[] }> {
  const response = await request<{ agents: any[] }>('/?route=admin&action=agents/pending');
  return { agents: response.data.agents ?? [] };
}

// NOTE: fetchAdminUniversities / createAdminUniversity / updateAdminUniversity / deleteAdminUniversity
// and their program counterparts below are legacy-shaped adapters kept for AdminDashboardPage.tsx's
// quick-edit widgets. They delegate to the same real UniversityController/CourseController endpoints
// as fetchAdminUniversitiesLive/fetchAdminUniversityCourses etc. further down this file, reshaping
// the response into the AdminUniversityRecord/AdminProgramRecord legacy types (id = public_id string).
function toAdminUniversityRecord(row: any): AdminUniversityRecord {
  return {
    id: row.public_id,
    name: row.name,
    shortName: null,
    country: row.country,
    city: row.city ?? null,
    partnershipType: row.partnership_type,
    isActive: row.status === 'active',
    programCount: row.course_count ?? 0,
    createdAt: row.created_at,
    logoUrl: row.logo_url ?? null,
    logoThumbUrl: row.logo_thumb_url ?? null,
  };
}

function toAdminProgramRecord(row: any, universityId: string, universityName: string): AdminProgramRecord {
  return {
    id: row.public_id,
    universityId,
    universityName,
    name: row.name,
    degreeLevel: row.degree_level,
    subjectArea: null,
    tuitionFee: row.tuition_fee_amount ?? null,
    tuitionCurrency: row.tuition_fee_currency ?? null,
    intakeMonths: [],
    isActive: row.status === 'active',
    createdAt: row.created_at,
  };
}

export async function fetchAdminUniversities(params: {
  page?: number;
  perPage?: number;
  q?: string;
  status?: string;
} = {}): Promise<{ universities: AdminUniversityRecord[]; meta: PaginationMeta }> {
  const response = await api.get<any[]>('admin/universities', {
    params: { page: params.page, per_page: params.perPage, status: params.status },
  });
  const rows = (Array.isArray(response.data) ? response.data : []) as any[];
  const q = (params.q ?? '').toLowerCase();
  const filtered = q ? rows.filter((r) => String(r.name).toLowerCase().includes(q)) : rows;

  return {
    universities: filtered.map(toAdminUniversityRecord),
    meta: response.meta as PaginationMeta,
  };
}

export async function createAdminUniversity(payload: {
  name: string;
  short_name?: string;
  country: string;
  city?: string;
  partnership_type?: 'exclusive' | 'non_exclusive';
  is_active?: boolean;
}): Promise<AdminUniversityRecord> {
  const response = await api.post<{ university: any }>('admin/universities', {
    name: payload.name,
    country: payload.country,
    city: payload.city,
    partnership_type: payload.partnership_type,
  });

  return toAdminUniversityRecord(response.data.university);
}

export async function updateAdminUniversity(payload: {
  id: string;
  name?: string;
  short_name?: string;
  country?: string;
  city?: string;
  partnership_type?: 'exclusive' | 'non_exclusive';
  is_active?: boolean;
}): Promise<AdminUniversityRecord> {
  const response = await api.put<{ university: any }>(`admin/universities/${encodeURIComponent(payload.id)}`, {
    name: payload.name,
    country: payload.country,
    city: payload.city,
    partnership_type: payload.partnership_type,
    status: payload.is_active === undefined ? undefined : payload.is_active ? 'active' : 'inactive',
  });

  return toAdminUniversityRecord(response.data.university);
}

export async function deleteAdminUniversity(universityId: string): Promise<void> {
  await api.delete(`admin/universities/${encodeURIComponent(universityId)}`);
}

export async function fetchAdminPrograms(params: {
  page?: number;
  perPage?: number;
  q?: string;
  status?: string;
  universityId?: string;
  degreeLevel?: string;
} = {}): Promise<{ programs: AdminProgramRecord[]; meta: PaginationMeta }> {
  const universitiesResult = await fetchAdminUniversities({ perPage: 100 });
  const universities = params.universityId
    ? universitiesResult.universities.filter((u) => u.id === params.universityId)
    : universitiesResult.universities;

  const batches = await Promise.all(
    universities.map(async (university) => {
      const courses = await fetchAdminUniversityCourses(university.id);
      return courses.map((course: any) => toAdminProgramRecord(course, university.id, university.name));
    })
  );

  let programs = batches.flat();
  const q = (params.q ?? '').toLowerCase();
  if (q) {
    programs = programs.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (params.degreeLevel) {
    programs = programs.filter((p) => p.degreeLevel === params.degreeLevel);
  }

  return {
    programs,
    meta: { current_page: 1, per_page: programs.length || 1, total: programs.length, total_pages: 1, has_next: false, has_prev: false },
  };
}

export async function createAdminProgram(payload: {
  university_id: string;
  name: string;
  degree_level: string;
  subject_area?: string;
  tuition_fee?: number | null;
  tuition_currency?: string;
  intake_months?: string[];
  is_active?: boolean;
}): Promise<AdminProgramRecord> {
  const response = await api.post<{ course: any }>(`admin/universities/${encodeURIComponent(payload.university_id)}/courses`, {
    name: payload.name,
    degree_level: payload.degree_level,
  });

  return toAdminProgramRecord(response.data.course, payload.university_id, '');
}

export async function updateAdminProgram(payload: {
  id: string;
  university_id?: string;
  name?: string;
  degree_level?: string;
  subject_area?: string;
  tuition_fee?: number | null;
  tuition_currency?: string;
  intake_months?: string[];
  is_active?: boolean;
}): Promise<AdminProgramRecord> {
  const response = await api.put<{ course: any }>(`admin/courses/${encodeURIComponent(payload.id)}`, {
    name: payload.name,
    degree_level: payload.degree_level,
    status: payload.is_active === undefined ? undefined : payload.is_active ? 'active' : 'inactive',
  });

  return toAdminProgramRecord(response.data.course, payload.university_id ?? '', '');
}

export async function deleteAdminProgram(programId: string): Promise<void> {
  await api.delete(`admin/courses/${encodeURIComponent(programId)}`);
}

export async function fetchAdminAuditLog(params: {
  page?: number;
  perPage?: number;
  action?: string;
  entityType?: string;
} = {}): Promise<{ entries: AuditLogEntry[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'admin',
    action: 'get_audit_log',
    page: params.page,
    per_page: params.perPage,
    audit_action: params.action,
    entity_type: params.entityType,
  });

  const response = await request<{ entries: AuditLogEntry[] }>(`/?${query}`);

  return {
    entries: response.data.entries,
    meta: response.meta as PaginationMeta,
  };
}

// ── PHASE 5 API FUNCTIONS ──────────────────────────────────────────────────

export async function fetchAgentDashboardSummary(): Promise<any> {
  const response = await request<any>('/?route=agent&action=dashboard/summary');
  return response.data;
}

export async function fetchAgentStudents(params: {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
  agentPid?: string;
} = {}): Promise<{ students: any[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'agent',
    action: 'students',
    page: params.page,
    per_page: params.perPage,
    status: params.status,
    search: params.search,
    agent_pid: params.agentPid,
  });
  const response = await request<any>(`/?${query}`);
  return {
    students: response.data.students || response.data || [],
    meta: (response.meta || response.data.meta) as PaginationMeta,
  };
}

export async function fetchAgentStudentDetail(pid: string): Promise<any> {
  const response = await request<any>(`/?route=agent&action=students/${pid}`);
  return response.data;
}

export async function fetchAgentTeam(): Promise<any[]> {
  const response = await request<any[]>('/?route=agent&action=team');
  return response.data || [];
}

export async function fetchSubAgents(parentPid: string): Promise<any[]> {
  const response = await request<any[]>(`/?route=agent&action=team/${parentPid}/sub-agents`);
  return response.data || [];
}

export async function fetchSubAgentStudents(subAgentPid: string): Promise<any[]> {
  const response = await request<any[]>(`/?route=agent&action=team/${subAgentPid}/students`);
  return response.data || [];
}

export async function fetchAgentCommissions(params: {
  page?: number;
  status?: string;
} = {}): Promise<{ commissions: any[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'agent',
    action: 'commissions',
    page: params.page,
    status: params.status,
  });
  const response = await request<any>(`/?${query}`);
  return {
    commissions: response.data.commissions || response.data || [],
    meta: (response.meta || response.data.meta) as PaginationMeta,
  };
}

export async function fetchAgentCommissionsSummary(): Promise<any> {
  const response = await request<any>('/?route=agent&action=commissions/summary');
  return response.data;
}

export async function fetchStudentAgentInfo(): Promise<any> {
  const response = await request<any>('/?route=student&action=agent');
  return response.data;
}

export async function submitReassignmentRequest(payload: {
  reason: string;
  requested_agent_code?: string;
}): Promise<any> {
  const response = await request<any>('/?route=student&action=agent/reassignment-request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function fetchAdminReassignmentRequests(params: {
  page?: number;
  perPage?: number;
  status?: string;
  studentSearch?: string;
} = {}): Promise<{ requests: any[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'admin',
    action: 'reassignment-requests',
    page: params.page,
    per_page: params.perPage,
    status: params.status,
    student_search: params.studentSearch,
  });
  const response = await request<any>(`/?${query}`);
  return {
    requests: response.data.requests || response.data || [],
    meta: (response.meta || response.data.meta) as PaginationMeta,
  };
}

export async function fetchAdminReassignmentDetail(pid: string): Promise<any> {
  const response = await request<any>(`/?route=admin&action=reassignment-requests/${pid}`);
  return response.data;
}

export async function approveReassignment(pid: string, payload: {
  new_agent_code?: string;
  notes?: string;
}): Promise<any> {
  const response = await request<any>(`/?route=admin&action=reassignment-requests/${pid}/approve`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function denyReassignment(pid: string, payload: {
  notes?: string;
}): Promise<any> {
  const response = await request<any>(`/?route=admin&action=reassignment-requests/${pid}/deny`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function fetchStudentReassignmentHistory(studentPid: string): Promise<any[]> {
  const response = await request<any[]>(`/?route=admin&action=students/${studentPid}/reassignment-history`);
  return response.data || [];
}

export async function fetchAdminCommissions(params: {
  page?: number;
  perPage?: number;
  status?: string;
  agentPid?: string;
  from?: string;
  to?: string;
  search?: string;
} = {}): Promise<{ commissions: any[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'admin',
    action: 'commissions',
    page: params.page,
    per_page: params.perPage,
    status: params.status,
    agent_pid: params.agentPid,
    from: params.from,
    to: params.to,
    search: params.search,
  });
  const response = await request<any>(`/?${query}`);
  return {
    commissions: response.data.commissions || response.data || [],
    meta: (response.meta || response.data.meta) as PaginationMeta,
  };
}

export async function fetchAdminCommissionsSummary(): Promise<any> {
  const response = await request<any>('/?route=admin&action=commissions/summary');
  return response.data;
}

export async function createCommission(applicationPid: string, payload: {
  agent_public_id: string;
  amount: number;
  currency: string;
  percentage?: number;
  notes?: string;
}): Promise<any> {
  const response = await request<any>(`/?route=admin&action=applications/${applicationPid}/commissions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function fetchAdminStudents(params: {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
  agentScope?: string;
} = {}): Promise<{ students: any[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'admin',
    action: 'students',
    page: params.page,
    per_page: params.perPage,
    status: params.status,
    search: params.search,
    agent_scope: params.agentScope,
  });
  const response = await request<any>(`/?${query}`);
  return {
    students: response.data.students || response.data || [],
    meta: (response.meta || response.data?.meta) as PaginationMeta,
  };
}

export async function fetchAdminStudentDetail(pid: string): Promise<any> {
  const response = await request<any>(`/?route=admin&action=students/${encodeURIComponent(pid)}/detail`);
  return response.data;
}

// ── Student custom fields (admin-defined data-collection fields) ──────────

export type CustomFieldOption = { value: string; label: string };

export type CustomFieldDefinition = {
  public_id: string;
  label: string;
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file';
  options: CustomFieldOption[] | null;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CustomFieldValueRow = {
  definition_public_id: string;
  label: string;
  field_type: CustomFieldDefinition['field_type'];
  options: CustomFieldOption[] | null;
  is_required: boolean;
  value_text: string | null;
  file: { public_id: string; display_filename: string } | null;
};

export async function fetchAdminCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  const response = await api.get<{ definitions: CustomFieldDefinition[] }>('admin/student-custom-fields');
  return response.data.definitions ?? [];
}

export async function createAdminCustomFieldDefinition(payload: {
  label: string;
  field_type: CustomFieldDefinition['field_type'];
  options?: string[];
  is_required?: boolean;
}): Promise<CustomFieldDefinition> {
  const response = await api.post<{ definition: CustomFieldDefinition }>('admin/student-custom-fields', payload);
  return response.data.definition;
}

export async function updateAdminCustomFieldDefinition(
  pid: string,
  payload: Partial<{ label: string; field_type: string; options: string[]; is_required: boolean; is_active: boolean; display_order: number }>,
): Promise<CustomFieldDefinition> {
  const response = await api.put<{ definition: CustomFieldDefinition }>(`admin/student-custom-fields/${encodeURIComponent(pid)}`, payload);
  return response.data.definition;
}

export async function deleteAdminCustomFieldDefinition(pid: string): Promise<void> {
  await api.delete(`admin/student-custom-fields/${encodeURIComponent(pid)}`);
}

export async function reorderAdminCustomFieldDefinitions(order: { public_id: string; display_order: number }[]): Promise<void> {
  await api.post('admin/student-custom-fields/reorder', { order });
}

export async function fetchStudentCustomFields(): Promise<CustomFieldValueRow[]> {
  const response = await api.get<{ definitions: CustomFieldValueRow[] }>('student/custom-fields');
  return response.data.definitions ?? [];
}

export async function submitStudentCustomFieldValue(definitionPublicId: string, value: string): Promise<void> {
  await api.post('student/custom-fields/value', { definition_public_id: definitionPublicId, value });
}

export async function uploadStudentCustomFieldFile(definitionPublicId: string, file: File): Promise<{ file_public_id: string; display_filename: string }> {
  const formData = new FormData();
  formData.set('definition_public_id', definitionPublicId);
  formData.set('file', file);
  const response = await request<{ value: { file_public_id: string; display_filename: string } }>('/?route=student&action=custom-fields/file', {
    method: 'POST',
    body: formData,
  });
  return response.data.value;
}

export async function fetchApplicationCommissions(applicationPid: string): Promise<any[]> {
  const response = await request<any[]>(`/?route=admin&action=applications/${applicationPid}/commissions`);
  return response.data || [];
}

export async function editCommission(pid: string, payload: {
  amount?: number;
  percentage?: number;
  notes?: string;
}): Promise<any> {
  const response = await request<any>(`/?route=admin&action=commissions/${pid}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function confirmCommission(pid: string): Promise<any> {
  const response = await request<any>(`/?route=admin&action=commissions/${pid}/confirm`, {
    method: 'PUT',
  });
  return response.data;
}

export async function payCommission(pid: string): Promise<any> {
  const response = await request<any>(`/?route=admin&action=commissions/${pid}/pay`, {
    method: 'PUT',
  });
  return response.data;
}

export async function deleteCommission(pid: string): Promise<any> {
  const response = await request<any>(`/?route=admin&action=commissions/${pid}`, {
    method: 'DELETE',
  });
  return response.data;
}

export async function fetchAdminAgentTree(pid: string): Promise<any> {
  const response = await request<any>(`/?route=admin&action=agents/${pid}/tree`);
  return response.data;
}

export type AdminAgentDetail = {
  public_id: string;
  tier: number;
  status: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  agency_name: string | null;
  country: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  mobile_number: string | null;
  alternate_mobile_number: string | null;
  rejected_reason: string | null;
  created_at: string;
  application_submitted_at: string | null;
  parent_agent_name: string | null;
  parent_agent_public_id: string | null;
  email: string | null;
  documents: Partial<Record<AgentOnboardingDocType, AgentOnboardingDoc>>;
};

export async function fetchAdminAgentDetail(pid: string): Promise<AdminAgentDetail> {
  const response = await request<AdminAgentDetail>(`/?route=admin&action=agents/${encodeURIComponent(pid)}/detail`);
  return response.data;
}

export async function openAgentDocument(filePublicId: string): Promise<void> {
  const url = `${API_BASE_URL}/?route=files&action=${encodeURIComponent(filePublicId)}/download`;
  const headers = new Headers();
  if (accessToken !== null) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const response = await fetch(url, { headers, credentials: 'include' });
  if (!response.ok) {
    throw new Error('Could not load document.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
}

export async function fetchAdminDashboardSummary(): Promise<any> {
  const response = await request<any>('/?route=admin&action=dashboard/summary');
  return response.data;
}

export async function inviteSubAgent(payload: {
  full_name: string;
  agency_name: string;
  country: string;
  email: string;
  password: string;
  phone?: string;
  partnership_scope?: string;
  business_registration_number?: string;
  first_name?: string;
  last_name?: string;
  address_line?: string;
  city?: string;
  state?: string;
  alternate_mobile_number?: string;
}): Promise<{ status: string; message: string; subagent: { id: string; tier: number } }> {
  const response = await request<{ status: string; message: string; subagent: { id: string; tier: number } }>(
    '/?route=agent&action=sub-agents/invite',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return response.data;
}

function formatPath(path: string): string {
  if (path.startsWith('/?')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (cleanPath === '' || cleanPath.startsWith('?')) {
    return path;
  }

  const parts = cleanPath.split('?');
  const pathPart = parts[0];
  const queryPart = parts[1] ? '&' + parts[1] : '';

  const segments = pathPart.split('/');
  const route = segments[0];
  const action = segments.slice(1).join('/');

  return `/?route=${route}&action=${action}${queryPart}`;
}

const api = {
  get: <T = any>(path: string, config?: { params?: Record<string, any>; headers?: Record<string, string> }) => {
    const formatted = formatPath(path);
    const query = config?.params ? (formatted.includes('?') ? '&' : '?') + buildQuery(config.params) : '';
    return request<T>(formatted + query, { method: 'GET', headers: config?.headers });
  },
  post: <T = any>(path: string, data?: any, config?: { headers?: Record<string, string> }) => {
    const formatted = formatPath(path);
    const body = data instanceof FormData ? data : (data !== undefined ? JSON.stringify(data) : undefined);
    return request<T>(formatted, { method: 'POST', body, headers: config?.headers });
  },
  put: <T = any>(path: string, data?: any, config?: { headers?: Record<string, string> }) => {
    const formatted = formatPath(path);
    return request<T>(formatted, { method: 'PUT', body: JSON.stringify(data), headers: config?.headers });
  },
  delete: <T = any>(path: string, config?: { headers?: Record<string, string> }) => {
    const formatted = formatPath(path);
    return request<T>(formatted, { method: 'DELETE', headers: config?.headers });
  }
};

export default api;


export class ApiRequestError extends Error {
  code: string;
  status: number;
  data?: any;
  constructor(message: string, code: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

export type AuthLoginResult = {
  user?: AuthUser;
  accessToken?: string;
  twoFactorRequired?: boolean;
  requires2fa?: boolean;
  preAuthToken?: string;
  accountStatus?: string;
  rejectionReason?: string;
  submittedAt?: string;
  message?: string;
};

export async function requestAdminOtpLogin(email: string): Promise<void> {
  await request('/?route=auth&action=admin-otp-login/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyAdminOtpLogin(email: string, otpCode: string): Promise<AuthLoginResult> {
  const response = await request<{ user: AuthUser; accessToken?: string; access_token?: string }>(
    '/?route=auth&action=admin-otp-login/verify',
    {
      method: 'POST',
      body: JSON.stringify({ email, otp_code: otpCode }),
    }
  );

  if (response.data.accessToken || response.data.access_token) {
    setAccessToken(extractAccessToken(response.data as Record<string, unknown>));
  }

  return {
    user: response.data.user,
    accessToken: response.data.accessToken ?? response.data.access_token,
    message: response.message,
  };
}

export async function verifyTwoFactorLogin(preAuthToken: string, code: string): Promise<AuthLoginResult> {
  const response = await request<{ user: AuthUser; accessToken?: string; access_token?: string }>(
    '/?route=auth&action=verify-2fa',
    {
      method: 'POST',
      body: JSON.stringify({ pre_auth_token: preAuthToken, otp_code: code }),
    }
  );
  if (response.data.accessToken || response.data.access_token) {
    setAccessToken(extractAccessToken(response.data as Record<string, unknown>));
  }
  return {
    user: response.data.user,
    accessToken: response.data.accessToken ?? response.data.access_token,
    message: response.message,
  };
}

export async function resend2faCode(preAuthToken: string): Promise<void> {
  await request('/?route=auth&action=resend-2fa', {
    method: 'POST',
    body: JSON.stringify({ pre_auth_token: preAuthToken }),
  });
}


export async function changePassword(payload: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<void> {
  await request('/?route=auth&action=change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function toggle2FA(payload: { enable: boolean; password: string }): Promise<void> {
  await request('/?route=auth&action=2fa/toggle', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function requestForgotPassword(
  email: string,
  role: 'student' | 'agent' | 'admin',
): Promise<void> {
  await request('/?route=auth&action=forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function verifyForgotPasswordOtp(
  email: string,
  otpCode: string,
  role: 'student' | 'agent' | 'admin',
): Promise<string> {
  const response = await request<{ reset_token: string }>(
    '/?route=auth&action=forgot-password/verify-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email, otp_code: otpCode, role }),
    }
  );

  return response.data.reset_token;
}

export async function confirmForgotPassword(
  resetToken: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  await request('/?route=auth&action=forgot-password/reset', {
    method: 'POST',
    body: JSON.stringify({
      reset_token: resetToken,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });
}
export async function refreshAuthSession(): Promise<AuthSessionResult> {
  const response = await request<AuthSessionResult>('/?route=auth&action=refresh', { method: 'POST' });
  if (response.data.accessToken) {
    setAccessToken(extractAccessToken(response.data as Record<string, unknown>));
  }
  return response.data;
}

export async function logoutRequest(): Promise<void> {
  await request('/?route=auth&action=logout', { method: 'POST' });
  setAccessToken(null);
}

export async function verifyStudentRegistrationOtp(email: string, code: string): Promise<{ user: AuthUser; accessToken: string }> {
  const response = await request<{ user: AuthUser; accessToken: string }>(
    '/?route=student&action=register/verify',
    {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }
  );
  setAccessToken(extractAccessToken(response.data as Record<string, unknown>));
  return response.data;
}

export async function verifyAgentRegistrationOtp(email: string, code: string): Promise<{ user: AuthUser; accessToken: string }> {
  const response = await request<{ user: AuthUser; accessToken: string }>(
    '/?route=agent&action=register/verify',
    {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }
  );
  setAccessToken(extractAccessToken(response.data as Record<string, unknown>));
  return response.data;
}

export interface ActivityLogEntry {
  id: number;
  actor_user_id: number | null;
  actor_user_type: string | null;
  actor_display_name: string | null;
  action: string;
  target_type: string | null;
  target_public_id: string | null;
  target_display: string | null;
  before_value: string | null;
  after_value: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  /** Plain-English sentence describing the action, computed server-side. */
  label?: string;
  /** lucide-react icon name, computed server-side. */
  icon?: string;
  /** Relative time string (e.g. "2h ago"), computed server-side. */
  time_ago?: string;
}

export interface ActivityLogParams {
  page?: number;
  perPage?: number;
  actorType?: string;
  /** Filters on the log's own action column. Sent as ?log_action= — NOT ?action=,
   * which is reserved by the /?route=X&action=Y routing convention. */
  logAction?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildActivityLogQuery(params: ActivityLogParams): string {
  const searchParams = new URLSearchParams();
  const map: Record<string, string | number | undefined> = {
    page: params.page,
    per_page: params.perPage,
    actor_type: params.actorType,
    log_action: params.logAction,
    target_type: params.targetType,
    date_from: params.dateFrom,
    date_to: params.dateTo,
  };
  Object.entries(map).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

async function fetchActivityLogs(routeAction: string, params: ActivityLogParams): Promise<{ logs: ActivityLogEntry[]; meta: PaginationMeta }> {
  const response = await api.get(`/?${routeAction}&` + buildActivityLogQuery(params));
  return {
    logs: Array.isArray(response.data) ? response.data : [],
    meta: response.meta as PaginationMeta,
  };
}

/** Own activity log — every admin sees only their own actions. */
export async function fetchAdminActivityLogs(params: ActivityLogParams = {}): Promise<{ logs: ActivityLogEntry[]; meta: PaginationMeta }> {
  return fetchActivityLogs('route=admin&action=activity-logs', params);
}

/** Super Activity Log — system-wide. Gated by activity_logs.view_all (super admin bypasses). */
export async function fetchSuperActivityLogs(params: ActivityLogParams = {}): Promise<{ logs: ActivityLogEntry[]; meta: PaginationMeta }> {
  return fetchActivityLogs('route=admin&action=super-activity-logs', params);
}

/** Agent activity log — self + tier-aware subtree. */
export async function fetchAgentActivityLogs(params: ActivityLogParams = {}): Promise<{ logs: ActivityLogEntry[]; meta: PaginationMeta }> {
  return fetchActivityLogs('route=agent&action=activity-logs', params);
}


export async function fetchAdminNoticesFeed(params: Record<string, any> = {}): Promise<{ notices: any[], meta?: PaginationMeta }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const response = await api.get(`/?route=admin&action=notices/feed&` + searchParams.toString());
  return { notices: response.data.notices || [], meta: response.data.meta };
}
export async function fetchStudentNoticesFeed(params: Record<string, any> = {}): Promise<{ notices: any[], meta?: PaginationMeta }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const response = await api.get(`/?route=student&action=notices/feed&` + searchParams.toString());
  return { notices: response.data.notices || [], meta: response.data.meta };
}


// --- Applications (admin/agent/student) — real ApplicationController / DocumentRequestController / PaymentTrackingController wiring ---

export async function createAdminApplicationDocumentRequest(
  applicationPublicId: string,
  payload: { doc_label: string; description?: string; deadline?: string }
): Promise<any> {
  const response = await api.post<{ document_request: any }>(
    `admin/applications/${encodeURIComponent(applicationPublicId)}/document-requests`,
    payload
  );
  return response.data.document_request;
}

export async function createAdminApplicationPaymentRequest(
  applicationPublicId: string,
  payload: { label: string; amount?: number; currency?: string; payment_link?: string; due_date?: string }
): Promise<any> {
  const response = await api.post<{ payment_request: any }>(
    `admin/applications/${encodeURIComponent(applicationPublicId)}/payment-requests`,
    payload
  );
  return response.data.payment_request;
}

export async function fetchAdminApplications(params: {
  page?: number;
  perPage?: number;
  status?: string;
  universityPid?: string;
  search?: string;
} = {}): Promise<{ applications: any[]; meta: PaginationMeta }> {
  const response = await api.get<any[]>('admin/applications', {
    params: { page: params.page, per_page: params.perPage, status: params.status, university_pid: params.universityPid, search: params.search },
  });
  return {
    applications: Array.isArray(response.data) ? response.data : [],
    meta: response.meta as PaginationMeta,
  };
}

export async function fetchAdminApplicationByPublicId(applicationPublicId: string): Promise<any> {
  const response = await api.get<{ application: any }>(`admin/applications/${encodeURIComponent(applicationPublicId)}`);
  return response.data.application;
}

export async function updateAdminApplicationStatus(
  applicationPublicId: string,
  status: string,
  note?: string
): Promise<any> {
  const response = await api.post<{ application: any }>(`admin/applications/${encodeURIComponent(applicationPublicId)}/status`, {
    status,
    note,
  });
  return response.data.application;
}

export async function adminWithdrawApplication(applicationPublicId: string, withdrawalReason?: string): Promise<any> {
  const response = await api.put<{ application: any }>(`admin/applications/${encodeURIComponent(applicationPublicId)}/withdraw`, {
    withdrawal_reason: withdrawalReason,
  });
  return response.data.application;
}

export async function adminReviewDocumentRequest(
  documentRequestPublicId: string,
  payload: { status: 'approved' | 'rejected'; rejection_reason?: string }
): Promise<any> {
  const response = await api.put<{ document_request: any }>(
    `admin/document-requests/${encodeURIComponent(documentRequestPublicId)}/review`,
    payload
  );
  return response.data.document_request;
}

export async function adminCancelDocumentRequest(documentRequestPublicId: string): Promise<any> {
  const response = await api.put<{ document_request: any }>(
    `admin/document-requests/${encodeURIComponent(documentRequestPublicId)}/cancel`,
    {}
  );
  return response.data.document_request;
}

export async function adminVerifyPayment(
  paymentPublicId: string,
  payload: { status: 'confirmed' | 'disputed'; note?: string }
): Promise<any> {
  const response = await api.put<{ payment_request: any }>(`admin/payment-requests/${encodeURIComponent(paymentPublicId)}/verify`, payload);
  return response.data.payment_request;
}

export async function adminResolvePayment(paymentPublicId: string, payload: { status: 'confirmed' | 'cancelled'; note?: string }): Promise<any> {
  const response = await api.put<{ payment_request: any }>(`admin/payment-requests/${encodeURIComponent(paymentPublicId)}/resolve`, payload);
  return response.data.payment_request;
}

// --- Universities / Courses / Intakes (admin catalog CRUD) — real UniversityController/CourseController/IntakeController wiring ---

export async function fetchAdminUniversitiesLive(params: {
  page?: number;
  perPage?: number;
  status?: string;
  q?: string;
  /** 'exclusive' | 'non_exclusive' — omit for both. */
  partnershipType?: string;
  /** 'grouped' collapses sibling campus rows into one card per institution (management list).
   *  Omit for pickers/filters that need every individual campus row selectable. */
  view?: 'grouped';
} = {}): Promise<{ universities: any[]; meta: PaginationMeta }> {
  const response = await api.get<any[]>('admin/universities', {
    params: { page: params.page, per_page: params.perPage, status: params.status, q: params.q, partnership_type: params.partnershipType, view: params.view },
  });
  return { universities: Array.isArray(response.data) ? response.data : [], meta: response.meta as PaginationMeta };
}

export async function fetchAdminCoursesAll(params: {
  page?: number;
  perPage?: number;
  q?: string;
  universityId?: string;
  degreeLevel?: string;
} = {}): Promise<{ courses: any[]; meta: any }> {
  const response = await api.get<any[]>('admin/courses', {
    params: {
      page: params.page,
      per_page: params.perPage,
      q: params.q,
      university_id: params.universityId,
      degree_level: params.degreeLevel,
    },
  });
  return { courses: Array.isArray(response.data) ? response.data : [], meta: response.meta };
}

export async function fetchAdminIntakesAll(params: {
  page?: number;
  perPage?: number;
  q?: string;
  universityId?: string;
  courseId?: string;
  status?: string;
} = {}): Promise<{ intakes: any[]; meta: any }> {
  const response = await api.get<any[]>('admin/intakes', {
    params: {
      page: params.page,
      per_page: params.perPage,
      q: params.q,
      university_id: params.universityId,
      course_id: params.courseId,
      status: params.status,
    },
  });
  return { intakes: Array.isArray(response.data) ? response.data : [], meta: response.meta };
}

export async function fetchAdminUniversityLive(publicId: string): Promise<any> {
  const response = await api.get<{ university: any }>(`admin/universities/${encodeURIComponent(publicId)}`);
  return response.data.university;
}

export async function createAdminUniversityLive(payload: Record<string, unknown>): Promise<any> {
  const response = await api.post<{ university: any }>('admin/universities', payload);
  return response.data.university;
}

export async function updateAdminUniversityLive(publicId: string, payload: Record<string, unknown>): Promise<any> {
  const response = await api.put<{ university: any }>(`admin/universities/${encodeURIComponent(publicId)}`, payload);
  return response.data.university;
}

export async function deleteAdminUniversityLive(publicId: string): Promise<void> {
  await api.delete(`admin/universities/${encodeURIComponent(publicId)}`);
}

export async function uploadUniversityLogo(publicId: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.set('logo', file);
  const response = await request<{ university: any }>(`/?route=admin&action=universities/${encodeURIComponent(publicId)}/logo`, {
    method: 'POST',
    body: formData,
  });
  return response.data.university;
}

export async function fetchAdminUniversityCampuses(universityPublicId: string): Promise<any[]> {
  const response = await api.get<{ campuses: any[] }>(`admin/universities/${encodeURIComponent(universityPublicId)}/campuses`);
  return response.data.campuses ?? [];
}

export async function fetchAdminUniversityCourses(universityPublicId: string): Promise<any[]> {
  // per_page is set high (not the endpoint's default of 20) because callers treat the
  // returned array as the complete course list — e.g. AdminUniversitiesPage.tsx derives its
  // displayed course count from .length, and fetchAdminPrograms flattens this across every
  // university. Universities can have 100+ courses, so a low page size silently truncates both.
  const response = await api.get<any[]>(`admin/universities/${encodeURIComponent(universityPublicId)}/courses?per_page=1000`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function createAdminUniversityCourse(universityPublicId: string, payload: Record<string, unknown>): Promise<any> {
  const response = await api.post<{ course: any }>(`admin/universities/${encodeURIComponent(universityPublicId)}/courses`, payload);
  return response.data.course;
}

export async function updateAdminCourseLive(coursePublicId: string, payload: Record<string, unknown>): Promise<any> {
  const response = await api.put<{ course: any }>(`admin/courses/${encodeURIComponent(coursePublicId)}`, payload);
  return response.data.course;
}

export async function updateAdminCourseFee(coursePublicId: string, amount: number, currency = 'EUR'): Promise<any> {
  const response = await api.put<any>(`admin/courses/${encodeURIComponent(coursePublicId)}/fee`, { amount, currency });
  return response.data;
}

export async function deleteAdminCourseLive(coursePublicId: string): Promise<void> {
  await api.delete(`admin/courses/${encodeURIComponent(coursePublicId)}`);
}

export async function fetchAdminCourseIntakes(
  coursePublicId: string,
  params: { page?: number; perPage?: number } = {}
): Promise<{ intakes: any[]; meta: PaginationMeta }> {
  const response = await api.get<any[]>(`admin/courses/${encodeURIComponent(coursePublicId)}/intakes`, {
    params: { page: params.page, per_page: params.perPage },
  });
  return { intakes: Array.isArray(response.data) ? response.data : [], meta: response.meta as PaginationMeta };
}

export async function createAdminCourseIntake(coursePublicId: string, payload: Record<string, unknown>): Promise<any> {
  const response = await api.post<{ intake: any }>(`admin/courses/${encodeURIComponent(coursePublicId)}/intakes`, payload);
  return response.data.intake;
}

export async function updateAdminIntakeLive(intakePublicId: string, payload: Record<string, unknown>): Promise<any> {
  const response = await api.put<{ intake: any }>(`admin/intakes/${encodeURIComponent(intakePublicId)}`, payload);
  return response.data.intake;
}

export async function deleteAdminIntakeLive(intakePublicId: string): Promise<void> {
  await api.delete(`admin/intakes/${encodeURIComponent(intakePublicId)}`);
}

export async function cloneAdminIntake(intakePublicId: string, payload?: { name?: string }): Promise<any> {
  const response = await api.post<{ intake: any }>(`admin/intakes/${encodeURIComponent(intakePublicId)}/clone`, payload ?? {});
  return response.data.intake;
}

export async function updateAdminIntakeStatus(intakePublicId: string, payload: { status: string }): Promise<any> {
  const response = await api.put<{ intake: any }>(`admin/intakes/${encodeURIComponent(intakePublicId)}/status`, payload);
  return response.data.intake;
}

export async function eraseAdminFile(filePublicId: string, reason: string): Promise<{ message: string }> {
  const response = await request<{ message?: string }>(`/?route=admin&action=files/${encodeURIComponent(filePublicId)}/erase`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
  return { message: response.message || response.data?.message || 'File permanently erased successfully.' };
}
export async function fetchAdminSecurityEvents(params: {
  page?: number;
  perPage?: number;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<{ events: any[]; meta: PaginationMeta }> {
  const response = await api.get<any[]>('admin/security-events', {
    params: { page: params.page, per_page: params.perPage, event_type: params.eventType, date_from: params.dateFrom, date_to: params.dateTo },
  });
  return { events: Array.isArray(response.data) ? response.data : [], meta: response.meta as PaginationMeta };
}

export async function createAdminStaffAccount(payload: {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  is_super_admin?: boolean;
  pages?: Record<string, PageAccessLevel>;
}): Promise<void> {
  await request('/?route=auth&action=register/admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(publicId: string): Promise<void> {
  await request(`/?route=admin&action=admins/${encodeURIComponent(publicId)}`, {
    method: 'DELETE',
  });
}
export async function fetchAgentApplications(params: {
  page?: number;
  perPage?: number;
  status?: string;
  agentPid?: string;
} = {}): Promise<{ applications: any[]; meta: PaginationMeta }> {
  const response = await api.get<any[]>('agent/applications', {
    params: { page: params.page, per_page: params.perPage, status: params.status, agent_pid: params.agentPid },
  });
  return { applications: Array.isArray(response.data) ? response.data : [], meta: response.meta as PaginationMeta };
}

export async function fetchAgentApplicationDetail(applicationPublicId: string): Promise<any> {
  const response = await api.get<{ application: any }>(`agent/applications/${encodeURIComponent(applicationPublicId)}`);
  return response.data.application;
}
export async function fetchAgentNoticesFeed(params: Record<string, any> = {}): Promise<{ notices: any[], meta?: PaginationMeta }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const response = await api.get(`/?route=agent&action=notices/feed&` + searchParams.toString());
  return { notices: response.data.notices || [], meta: response.data.meta };
}
export type AgentOnboardingDocType = 'profile_photo' | 'aadhar_card' | 'cv_resume';

export type AgentOnboardingDoc = {
  public_id: string;
  filename: string;
  uploaded_at: string;
};

export type AgentOnboardingStatus = {
  agent: {
    public_id: string;
    first_name: string | null;
    last_name: string | null;
    full_name: string;
    agency_name: string | null;
    address_line: string | null;
    city: string | null;
    state: string | null;
    mobile_number: string | null;
    alternate_mobile_number: string | null;
    country: string | null;
    status: 'registered' | 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
    rejected_reason: string | null;
    created_at: string;
  };
  documents: Partial<Record<AgentOnboardingDocType, AgentOnboardingDoc>>;
};

export async function fetchAgentOnboardingStatus(): Promise<AgentOnboardingStatus> {
  const response = await request<AgentOnboardingStatus>('/?route=agent&action=onboarding/status');
  return response.data;
}

export async function uploadAgentOnboardingDocument(
  file: File,
  docType: AgentOnboardingDocType
): Promise<{ public_id: string; document_type: string; filename: string }> {
  const formData = new FormData();
  formData.set('document_type', docType);
  formData.set('file', file);

  const response = await request<{ public_id: string; document_type: string; filename: string }>(
    '/?route=agent&action=onboarding/documents',
    { method: 'POST', body: formData }
  );
  return response.data;
}

export type AgentOnboardingDraftPayload = {
  first_name?: string;
  last_name?: string;
  address_line?: string;
  city?: string;
  state?: string;
  mobile_number?: string;
  alternate_mobile_number?: string;
};

export async function saveAgentOnboardingDraft(
  payload: AgentOnboardingDraftPayload
): Promise<{ status: string }> {
  const response = await request<{ status: string }>('/?route=agent&action=onboarding/draft', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function submitAgentOnboardingApplication(
  payload: AgentOnboardingDraftPayload = {}
): Promise<{ status: string }> {
  const response = await request<{ status: string }>('/?route=agent&action=onboarding/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function uploadSubAgentDocument(
  pid: string,
  file: File,
  docType: AgentOnboardingDocType
): Promise<{ public_id: string; document_type: string; filename: string }> {
  const formData = new FormData();
  formData.set('document_type', docType);
  formData.set('file', file);

  const response = await request<{ public_id: string; document_type: string; filename: string }>(
    `/?route=agent&action=sub-agents/${encodeURIComponent(pid)}/documents`,
    { method: 'POST', body: formData }
  );
  return response.data;
}

export async function fetchStudentApplicationsList(): Promise<any[]> {
  const response = await api.get<{ applications: any[] }>('student/applications');
  const rows = response.data.applications ?? [];
  // StudentController::listApplications aliases courses.name as program_name;
  // the applications table/detail view (built against admin/agent naming) reads course_name.
  return rows.map((row) => ({ ...row, course_name: row.program_name }));
}

export async function fetchStudentApplicationDetail(applicationPublicId: string): Promise<any> {
  const response = await api.get<{ application: any }>(`student/applications/${encodeURIComponent(applicationPublicId)}`);
  return response.data.application;
}

export async function studentWithdrawApplication(applicationPublicId: string, withdrawalReason?: string): Promise<any> {
  const response = await api.put<{ application: any }>(`student/applications/${encodeURIComponent(applicationPublicId)}/withdraw`, {
    withdrawal_reason: withdrawalReason,
  });
  return response.data.application;
}

export async function studentSubmitApplication(applicationPublicId: string): Promise<any> {
  const response = await api.put<{ application: any }>(`student/applications/${encodeURIComponent(applicationPublicId)}/submit`, {});
  return response.data.application;
}

export async function fetchStudentDocumentRequests(): Promise<any[]> {
  const response = await api.get<{ document_requests: any[] }>('student/document-requests');
  return response.data.document_requests ?? [];
}

export async function submitStudentDocumentRequest(requestPublicId: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.set('file', file);
  const response = await request<{ document_request: any }>(
    `/?route=student&action=document-requests/${encodeURIComponent(requestPublicId)}/submit`,
    { method: 'POST', body: formData }
  );
  return response.data.document_request;
}

export async function markPaymentPaid(paymentPublicId: string): Promise<any> {
  const response = await api.put<{ payment_request: any }>(`student/payments/${encodeURIComponent(paymentPublicId)}/mark-paid`, {});
  return response.data.payment_request;
}

export async function fetchStudentPayments(): Promise<any[]> {
  const response = await api.get<{ payments: any[] }>('student/payments');
  return response.data.payments ?? [];
}

export async function fetchReadiness(): Promise<any> {
  const response = await api.get<{ readiness: any }>('student/readiness');
  return response.data.readiness;
}

export async function saveReadinessDraft(payload: Record<string, unknown>): Promise<void> {
  await api.put('student/readiness/draft', payload);
}

export async function uploadReadinessDocument(category: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.set('category', category);
  formData.set('file', file);
  const response = await request<{ document: any }>('/?route=student&action=readiness/documents', {
    method: 'POST',
    body: formData,
  });
  return response.data.document;
}

export async function submitReadiness(applicationPid?: string): Promise<{ message: string }> {
  const response = await api.post<{ message?: string }>('student/readiness/submit', applicationPid ? { application_pid: applicationPid } : {});
  return { message: response.message };
}

// ── Agent-assisted readiness (same endpoints, scoped to a student in the agent's network) ──

export async function fetchAgentStudentReadiness(studentPid: string): Promise<any> {
  const response = await api.get<{ readiness: any }>(`agent/students/${encodeURIComponent(studentPid)}/readiness`);
  return response.data.readiness;
}

export async function saveAgentStudentReadinessDraft(studentPid: string, payload: Record<string, unknown>): Promise<void> {
  await api.put(`agent/students/${encodeURIComponent(studentPid)}/readiness/draft`, payload);
}

export async function uploadAgentStudentReadinessDocument(studentPid: string, category: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.set('category', category);
  formData.set('file', file);
  const response = await request<{ document: any }>(`/?route=agent&action=students/${encodeURIComponent(studentPid)}/readiness/documents`, {
    method: 'POST',
    body: formData,
  });
  return response.data.document;
}

export async function submitAgentStudentReadiness(studentPid: string, applicationPid?: string): Promise<{ message: string }> {
  const response = await api.post<{ message?: string }>(`agent/students/${encodeURIComponent(studentPid)}/readiness/submit`, applicationPid ? { application_pid: applicationPid } : {});
  return { message: response.message };
}

export async function agentCreateStudent(payload: { full_name: string; email: string; mobile: string }): Promise<{ public_id: string; full_name: string }> {
  const response = await api.post<{ student: { public_id: string; full_name: string } }>('agent/students', payload);
  return response.data.student;
}

// ── Academic history + English test scores ──────────────────────────────────

export async function fetchStudentAcademicProfile(): Promise<{ academics: any[]; test_scores: any[] }> {
  const response = await api.get<{ academics: any[]; test_scores: any[] }>('student/academic-profile');
  return response.data;
}

export async function addStudentAcademic(payload: Record<string, unknown>): Promise<string> {
  const response = await api.post<{ public_id: string }>('student/academic-profile/academics', payload);
  return response.data.public_id;
}

export async function deleteStudentAcademic(recordPid: string): Promise<void> {
  await api.delete(`student/academic-profile/academics/${encodeURIComponent(recordPid)}`);
}

export async function addStudentTestScore(payload: Record<string, unknown>): Promise<string> {
  const response = await api.post<{ public_id: string }>('student/academic-profile/test-scores', payload);
  return response.data.public_id;
}

export async function deleteStudentTestScore(recordPid: string): Promise<void> {
  await api.delete(`student/academic-profile/test-scores/${encodeURIComponent(recordPid)}`);
}

export async function fetchAgentStudentAcademicProfile(studentPid: string): Promise<{ academics: any[]; test_scores: any[] }> {
  const response = await api.get<{ academics: any[]; test_scores: any[] }>(`agent/students/${encodeURIComponent(studentPid)}/academic-profile`);
  return response.data;
}

export async function addAgentStudentAcademic(studentPid: string, payload: Record<string, unknown>): Promise<string> {
  const response = await api.post<{ public_id: string }>(`agent/students/${encodeURIComponent(studentPid)}/academic-profile/academics`, payload);
  return response.data.public_id;
}

export async function deleteAgentStudentAcademic(studentPid: string, recordPid: string): Promise<void> {
  await api.delete(`agent/students/${encodeURIComponent(studentPid)}/academic-profile/academics/${encodeURIComponent(recordPid)}`);
}

export async function addAgentStudentTestScore(studentPid: string, payload: Record<string, unknown>): Promise<string> {
  const response = await api.post<{ public_id: string }>(`agent/students/${encodeURIComponent(studentPid)}/academic-profile/test-scores`, payload);
  return response.data.public_id;
}

export async function deleteAgentStudentTestScore(studentPid: string, recordPid: string): Promise<void> {
  await api.delete(`agent/students/${encodeURIComponent(studentPid)}/academic-profile/test-scores/${encodeURIComponent(recordPid)}`);
}

export async function fetchAgentDirectory(query?: string): Promise<any[]> {
  const response = await api.get<{ agents: any[] }>('student/agents/directory', { params: { q: query } });
  return response.data.agents ?? [];
}
