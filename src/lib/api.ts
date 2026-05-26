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

export function clearAuthSession(): void {
  accessToken = null;
}
