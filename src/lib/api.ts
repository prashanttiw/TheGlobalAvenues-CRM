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

  if (!headers.has('Content-Type') && init.body !== undefined) {
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

  const payload = await response.json();

  if (!response.ok || payload.success !== true) {
    const error = payload as ApiError;
    const message = error.message || 'Request failed';
    throw new Error(message);
  }

  return payload as ApiSuccess<T>;
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
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

  accessToken = response.data.accessToken;
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

  accessToken = response.data.accessToken;

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

  accessToken = response.data.accessToken;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>('/?route=auth&action=get_me');

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

export function clearAuthSession(): void {
  accessToken = null;
}
