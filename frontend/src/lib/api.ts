'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pulse_token');
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch<{ token: string; user: import('./types').User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (data: {
      email: string;
      password: string;
      full_name: string;
      workspace_name: string;
      workspace_slug: string;
    }) =>
      apiFetch<{
        token: string;
        user: import('./types').User;
        workspace: import('./types').Workspace;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  admin: {
    getUsers: () => apiFetch<import('./types').User[]>('/api/admin/users'),
    createUser: (data: { email: string; password: string; full_name: string; role: string }) =>
      apiFetch<import('./types').User>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateUser: (id: string, data: Partial<import('./types').User>) =>
      apiFetch<import('./types').User>(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getClients: () => apiFetch<import('./types').Client[]>('/api/admin/clients'),
    createClient: (data: { name: string; contact_email?: string }) =>
      apiFetch<import('./types').Client>('/api/admin/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getProjects: () => apiFetch<import('./types').Project[]>('/api/admin/projects'),
    createProject: (data: { name: string; description?: string; client_id?: string }) =>
      apiFetch<import('./types').Project>('/api/admin/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addMember: (projectId: string, data: { user_id: string; role: string }) =>
      apiFetch<unknown>(`/api/admin/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getIntegrations: () => apiFetch<import('./types').Integration[]>('/api/admin/integrations'),
    createIntegration: (data: {
      provider: string;
      access_token_enc?: string;
      metadata?: Record<string, unknown>;
    }) =>
      apiFetch<import('./types').Integration>('/api/admin/integrations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  tasks: {
    list: (projectId: string) =>
      apiFetch<import('./types').Task[]>(`/api/projects/${projectId}/tasks`),
    listMine: () =>
      apiFetch<import('./types').Task[]>('/api/tasks/mine').catch(() => {
        return [] as import('./types').Task[];
      }),
    get: (id: string) => apiFetch<import('./types').Task>(`/api/tasks/${id}`),
    setStatus: (id: string, status: string) =>
      apiFetch<import('./types').Task>(`/api/tasks/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    create: (data: {
      project_id: string;
      title: string;
      description?: string;
      assignee_user_id?: string;
      priority?: string;
    }) =>
      apiFetch<import('./types').Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  timer: {
    getCurrent: () =>
      apiFetch<import('./types').TimerSession | null>('/api/timer/current'),
    start: (task_id: string) =>
      apiFetch<import('./types').TimerSession>('/api/timer/start', {
        method: 'POST',
        body: JSON.stringify({ task_id }),
      }),
    pause: (pause_reason?: string) =>
      apiFetch<import('./types').TimerSession>('/api/timer/pause', {
        method: 'POST',
        body: JSON.stringify({ pause_reason }),
      }),
    resume: () =>
      apiFetch<import('./types').TimerSession>('/api/timer/resume', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    stop: (note?: string) =>
      apiFetch<{ session: import('./types').TimerSession }>('/api/timer/stop', {
        method: 'POST',
        body: JSON.stringify({ note }),
      }),
  },
  checkins: {
    getPending: () => apiFetch<import('./types').Checkin[]>('/api/checkins/pending'),
    respond: (id: string, response_note?: string) =>
      apiFetch<import('./types').Checkin>(`/api/checkins/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response_note }),
      }),
  },
  reports: {
    getTimesheet: (params: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<import('./types').TimeEntry[]>(`/api/reports/timesheet?${qs}`);
    },
    exportCsvUrl: (params: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return `${API_BASE}/api/reports/timesheet/export?${qs}`;
    },
    getLiveMonitor: () =>
      apiFetch<{
        snapshot_at: string;
        active_timers: import('./types').LiveMonitorEntry[];
      }>('/api/reports/live-monitor'),
    getCompliance: (params?: Record<string, string>) => {
      const qs = params ? new URLSearchParams(params).toString() : '';
      return apiFetch<import('./types').ComplianceMetric[]>(
        `/api/reports/compliance${qs ? `?${qs}` : ''}`
      );
    },
  },
  projects: {
    get: (id: string) => apiFetch<import('./types').Project>(`/api/projects/${id}`),
    getStatusMappings: (id: string) =>
      apiFetch<import('./types').StatusMapping[]>(`/api/projects/${id}/status-mappings`),
    setStatusMappings: (
      id: string,
      mappings: { pulse_status: string; external_status: string }[]
    ) =>
      apiFetch<import('./types').StatusMapping[]>(`/api/projects/${id}/status-mappings`, {
        method: 'PUT',
        body: JSON.stringify({ mappings }),
      }),
  },
};

export const API_BASE_URL = API_BASE;
