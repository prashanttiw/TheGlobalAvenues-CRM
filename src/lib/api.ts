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

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiSuccess<T>> {
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

  if (!response.ok || payload.success !== true) {
    const error = payload as ApiError;
    const message = error.message || 'Request failed';
    throw new Error(message);
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
  email: string;
  phone?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  firstName: string;
  lastName: string;
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
};

export type AgentProfileResponse = {
  id: number;
  user_id: number;
  agency_name: string;
  agency_country: string;
  registration_number?: string | null;
  partnership_type: 'exclusive' | 'non_exclusive';
  tier: 'bronze' | 'silver' | 'gold';
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'inactive';
};

export type CatalogUniversity = {
  id: number;
  name: string;
  shortName: string | null;
  country: string;
  city: string | null;
  partnershipType: 'exclusive' | 'non_exclusive';
  isExclusive: boolean;
  programCount: number;
  startingTuition: number | null;
  startingTuitionCurrency: string | null;
  startingTuitionLabel: string | null;
};

export type CatalogProgram = {
  id: number;
  name: string;
  degreeLevel: string;
  subjectArea: string | null;
  tuitionFee: number | null;
  tuitionCurrency: string | null;
  tuitionLabel: string | null;
  intakeMonths: string[];
  university: {
    id: number;
    name: string;
    shortName: string | null;
    country: string;
    city: string | null;
    partnershipType: 'exclusive' | 'non_exclusive';
    isExclusive: boolean;
  };
};

export type StudentApplicationSummary = {
  id: number;
  reference_number: string;
  status: string;
  priority: string;
  intake_month: number;
  intake_year: number;
  created_at: string;
  university_name: string;
  program_name: string;
};

export type StudentDashboardStats = {
  profileCompletion: number;
  points: number;
  applicationCount: number;
  recentApplications: StudentApplicationSummary[];
  unreadNotifications: number;
};

export type AdminPermissionSummary = {
  role: string;
  allowedStages: string[];
  canManageCatalog: boolean;
  catalogReadOnly: boolean;
  canReviewDocuments: boolean;
  canManageUsers: boolean;
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
  pendingAgentsPreview: Array<{
    id: number;
    agency_name: string;
    agency_country: string;
    registration_number: string | null;
    email: string;
    created_at: string;
  }>;
  pendingDocumentsPreview: Array<{
    id: number;
    document_type: string;
    status: string;
    created_at: string;
    reference_number: string;
    student_name: string;
  }>;
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
  id: number;
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
  university_id: number;
  university_name: string;
  university_country: string;
  program_id: number;
  program_name: string;
  degree_level: string;
  agent_id: number | null;
  agency_name: string | null;
  assignee_email: string | null;
  document_count: number | string;
  latest_note_at: string | null;
};

export type AdminApplicationDetail = {
  id: number;
  reference_number: string;
  student_user_id: number;
  agent_id: number | null;
  program_id: number;
  university_id: number;
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
    id: number;
    application_id: number;
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
  id: number;
  application_id: number;
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

export type AdminUserSummary = {
  id: number;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
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
  id: number;
  name: string;
  shortName: string | null;
  country: string;
  city: string | null;
  partnershipType: 'exclusive' | 'non_exclusive';
  isActive: boolean;
  programCount: number;
  createdAt: string;
};

export type AdminProgramRecord = {
  id: number;
  universityId: number;
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
  reference_number: string;
  student_user_id: number;
  agent_id?: number | null;
  sub_agent_id?: number | null;
  program_id: number;
  university_id: number;
  status: string;
  priority: string;
  intake_month: number;
  intake_year: number;
  source: string;
  created_at: string;
  updated_at: string;
  university_name: string;
  program_name: string;
  degree_level: string;
  history: Array<{
    id: number;
    from_status: string | null;
    to_status: string;
    changed_by: number;
    note: string | null;
    created_at: string;
  }>;
  documents: Array<{
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

  accessToken = extractAccessToken(response.data as Record<string, unknown>);
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

  accessToken = extractAccessToken(response.data as Record<string, unknown>);

  await updateAgentProfile({
    registration_number: payload.registration_number,
    partnership_type: payload.partnership_type,
  });
}

export async function loginWithPassword(email: string, password: string): Promise<void> {
  const response = await request<{ user: AuthUser; accessToken: string }>(
    '/?route=auth&action=login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  );

  accessToken = extractAccessToken(response.data as Record<string, unknown>);
}

export async function requestOtpLogin(email: string): Promise<void> {
  await request('/?route=auth&action=otp-login/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyOtpLogin(email: string, otpCode: string): Promise<{ user: AuthUser }> {
  const response = await request<{ user: AuthUser; accessToken: string }>(
    '/?route=auth&action=otp-login/verify',
    {
      method: 'POST',
      body: JSON.stringify({ email, otp_code: otpCode }),
    }
  );

  accessToken = extractAccessToken(response.data as Record<string, unknown>);
  return { user: response.data.user };
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>('/?route=auth&action=me');

  return response.data.user;
}

export async function fetchStudentProfile(): Promise<StudentProfileResponse> {
  const response = await request<{ profile: StudentProfileResponse }>('/?route=student&action=get_profile');

  return response.data.profile;
}

export async function updateStudentProfile(payload: Record<string, unknown>): Promise<StudentProfileResponse> {
  const response = await request<{ profile: StudentProfileResponse }>('/?route=student&action=update_profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data.profile;
}

export async function fetchAgentProfile(): Promise<AgentProfileResponse> {
  const response = await request<{ profile: AgentProfileResponse }>('/?route=agent&action=get_profile');

  return response.data.profile;
}

export async function updateAgentProfile(payload: Record<string, unknown>): Promise<AgentProfileResponse> {
  const response = await request<{ profile: AgentProfileResponse }>('/?route=agent&action=update_profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data.profile;
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

  const response = await request<{ universities: CatalogUniversity[] }>(`/?${query}`);

  return {
    universities: response.data.universities,
    meta: response.meta as PaginationMeta,
  };
}

export async function fetchPrograms(params: {
  page?: number;
  perPage?: number;
  q?: string;
  country?: string;
  subjectArea?: string;
  degreeLevel?: string;
  universityId?: number;
  budgetMax?: number;
} = {}): Promise<{ programs: CatalogProgram[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'university',
    action: 'search',
    page: params.page,
    per_page: params.perPage,
    q: params.q,
    country: params.country,
    subject_area: params.subjectArea,
    degree_level: params.degreeLevel,
    university_id: params.universityId,
    budget_max: params.budgetMax,
  });

  const response = await request<{ programs: CatalogProgram[] }>(`/?${query}`);

  return {
    programs: response.data.programs,
    meta: response.meta as PaginationMeta,
  };
}

export async function fetchUniversityDetail(universityId: number): Promise<CatalogUniversity & { programs: CatalogProgram[] }> {
  const query = buildQuery({
    route: 'university',
    action: 'get_detail',
    id: universityId,
  });

  const response = await request<{ university: CatalogUniversity & { programs: CatalogProgram[] } }>(`/?${query}`);

  return response.data.university;
}

export async function fetchStudentDashboard(): Promise<StudentDashboardStats> {
  const response = await request<{ stats: StudentDashboardStats }>('/?route=student&action=get_dashboard');

  return response.data.stats;
}

export async function fetchStudentApplications(): Promise<StudentApplicationSummary[]> {
  const response = await request<{ applications: StudentApplicationSummary[] }>('/?route=student&action=get_applications');

  return response.data.applications;
}

export async function fetchApplicationDetail(applicationId: number): Promise<ApplicationDetailResponse> {
  const query = buildQuery({
    route: 'application',
    action: 'get_detail',
    id: applicationId,
  });

  const response = await request<{ application: ApplicationDetailResponse }>(`/?${query}`);

  return response.data.application;
}

export async function createApplication(payload: {
  programId: number;
  universityId?: number;
  intakeMonth: number;
  intakeYear: number;
  source?: 'direct' | 'agent' | 'referral' | 'website';
  studentUserId?: number;
}): Promise<ApplicationDetailResponse> {
  const response = await request<{ application: ApplicationDetailResponse }>('/?route=application&action=create', {
    method: 'POST',
    body: JSON.stringify({
      program_id: payload.programId,
      university_id: payload.universityId,
      intake_month: payload.intakeMonth,
      intake_year: payload.intakeYear,
      source: payload.source ?? 'website',
      student_user_id: payload.studentUserId,
    }),
  });

  return response.data.application;
}

export async function uploadApplicationDocument(payload: {
  applicationId: number;
  documentType: string;
  file: File;
}): Promise<ApplicationDetailResponse['documents'][number]> {
  const formData = new FormData();
  formData.set('application_id', String(payload.applicationId));
  formData.set('document_type', payload.documentType);
  formData.set('file', payload.file);

  const response = await request<{ document: ApplicationDetailResponse['documents'][number] }>(
    '/?route=application&action=upload_document',
    {
      method: 'POST',
      body: formData,
    }
  );

  return response.data.document;
}

export async function deleteApplicationDocument(documentId: number): Promise<void> {
  const query = buildQuery({
    route: 'application',
    action: 'delete_document',
    id: documentId,
  });

  await request<{}>(`/?${query}`, {
    method: 'DELETE',
  });
}

export function clearAuthSession(): void {
  accessToken = null;
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const response = await request<{ stats: AdminDashboardStats }>('/?route=admin&action=get_dashboard_stats');

  return response.data.stats;
}

export async function fetchAdminPipeline(params: {
  page?: number;
  perPage?: number;
  q?: string;
  status?: string;
  country?: string;
  universityId?: number;
  agentId?: number;
  assignedTo?: number;
} = {}): Promise<{ applications: AdminPipelineItem[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'admin',
    action: 'get_pipeline',
    page: params.page,
    per_page: params.perPage,
    q: params.q,
    status: params.status,
    country: params.country,
    university_id: params.universityId,
    agent_id: params.agentId,
    assigned_to: params.assignedTo,
  });

  const response = await request<{ applications: AdminPipelineItem[] }>(`/?${query}`);

  return {
    applications: response.data.applications,
    meta: response.meta as PaginationMeta,
  };
}

export async function fetchAdminApplicationDetail(applicationId: number): Promise<AdminApplicationDetail> {
  const query = buildQuery({
    route: 'admin',
    action: 'get_application_detail',
    id: applicationId,
  });

  const response = await request<{ application: AdminApplicationDetail }>(`/?${query}`);

  return response.data.application;
}

export async function updateAdminApplication(payload: {
  application_id: number;
  status?: string;
  priority?: string;
  assigned_to?: number | null;
  note?: string;
  is_flagged?: boolean;
  flag_reason?: string;
}): Promise<AdminApplicationDetail> {
  const response = await request<{ application: AdminApplicationDetail }>('/?route=admin&action=update_application', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data.application;
}

export async function fetchAdminDocumentQueue(params: {
  page?: number;
  perPage?: number;
  q?: string;
  status?: string;
} = {}): Promise<{ documents: AdminDocumentQueueItem[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'admin',
    action: 'get_document_queue',
    page: params.page,
    per_page: params.perPage,
    q: params.q,
    status: params.status,
  });

  const response = await request<{ documents: AdminDocumentQueueItem[] }>(`/?${query}`);

  return {
    documents: response.data.documents,
    meta: response.meta as PaginationMeta,
  };
}

export async function reviewAdminDocument(payload: {
  document_id: number;
  decision: 'verified' | 'rejected';
  reason?: string;
}): Promise<AdminDocumentQueueItem> {
  const response = await request<{ document: AdminDocumentQueueItem }>('/?route=admin&action=review_document', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data.document;
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
  user_id: number;
  status?: string;
  role?: string;
}): Promise<AdminUserDetail> {
  const response = await request<{ user: AdminUserDetail }>('/?route=admin&action=update_user', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data.user;
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

export async function approveAdminAgent(payload: {
  agent_id: number;
  decision: 'approved' | 'rejected';
  note?: string;
}): Promise<AdminAgentSummary> {
  const response = await request<{ agent: AdminAgentSummary }>('/?route=admin&action=approve_agent', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data.agent;
}

export async function fetchAdminUniversities(params: {
  page?: number;
  perPage?: number;
  q?: string;
  status?: string;
} = {}): Promise<{ universities: AdminUniversityRecord[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'admin',
    action: 'get_universities',
    page: params.page,
    per_page: params.perPage,
    q: params.q,
    status: params.status,
  });

  const response = await request<{ universities: AdminUniversityRecord[] }>(`/?${query}`);

  return {
    universities: response.data.universities,
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
  const response = await request<{ university: AdminUniversityRecord }>('/?route=admin&action=create_university', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data.university;
}

export async function updateAdminUniversity(payload: {
  id: number;
  name?: string;
  short_name?: string;
  country?: string;
  city?: string;
  partnership_type?: 'exclusive' | 'non_exclusive';
  is_active?: boolean;
}): Promise<AdminUniversityRecord> {
  const response = await request<{ university: AdminUniversityRecord }>('/?route=admin&action=update_university', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data.university;
}

export async function deleteAdminUniversity(universityId: number): Promise<AdminUniversityRecord> {
  const query = buildQuery({
    route: 'admin',
    action: 'delete_university',
    id: universityId,
  });

  const response = await request<{ university: AdminUniversityRecord }>(`/?${query}`, {
    method: 'DELETE',
  });

  return response.data.university;
}

export async function fetchAdminPrograms(params: {
  page?: number;
  perPage?: number;
  q?: string;
  status?: string;
  universityId?: number;
  degreeLevel?: string;
} = {}): Promise<{ programs: AdminProgramRecord[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'admin',
    action: 'get_programs',
    page: params.page,
    per_page: params.perPage,
    q: params.q,
    status: params.status,
    university_id: params.universityId,
    degree_level: params.degreeLevel,
  });

  const response = await request<{ programs: AdminProgramRecord[] }>(`/?${query}`);

  return {
    programs: response.data.programs,
    meta: response.meta as PaginationMeta,
  };
}

export async function createAdminProgram(payload: {
  university_id: number;
  name: string;
  degree_level: string;
  subject_area?: string;
  tuition_fee?: number | null;
  tuition_currency?: string;
  intake_months?: string[];
  is_active?: boolean;
}): Promise<AdminProgramRecord> {
  const response = await request<{ program: AdminProgramRecord }>('/?route=admin&action=create_program', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data.program;
}

export async function updateAdminProgram(payload: {
  id: number;
  university_id?: number;
  name?: string;
  degree_level?: string;
  subject_area?: string;
  tuition_fee?: number | null;
  tuition_currency?: string;
  intake_months?: string[];
  is_active?: boolean;
}): Promise<AdminProgramRecord> {
  const response = await request<{ program: AdminProgramRecord }>('/?route=admin&action=update_program', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return response.data.program;
}

export async function deleteAdminProgram(programId: number): Promise<AdminProgramRecord> {
  const query = buildQuery({
    route: 'admin',
    action: 'delete_program',
    id: programId,
  });

  const response = await request<{ program: AdminProgramRecord }>(`/?${query}`, {
    method: 'DELETE',
  });

  return response.data.program;
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
} = {}): Promise<{ students: any[]; meta: PaginationMeta }> {
  const query = buildQuery({
    route: 'admin',
    action: 'students',
    page: params.page,
    per_page: params.perPage,
    status: params.status,
    search: params.search,
  });
  const response = await request<any>(`/?${query}`);
  return {
    students: response.data.students || response.data || [],
    meta: (response.meta || response.data?.meta) as PaginationMeta,
  };
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

export async function fetchAdminDashboardSummary(): Promise<any> {
  const response = await request<any>('/?route=admin&action=dashboard/summary');
  return response.data;
}

export async function inviteSubAgent(payload: {
  name: string;
  agency_name: string;
  email: string;
}): Promise<any> {
  const response = await request<any>('/?route=agent&action=sub-agents/invite', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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
    return request<T>(formatted, { method: 'POST', body: JSON.stringify(data), headers: config?.headers });
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

