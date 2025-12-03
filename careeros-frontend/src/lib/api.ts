const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}/api${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || 'An error occurred');
  }
  
  return response.json();
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ access_token: string; token_type: string }>('/auth/register', {
        method: 'POST',
        body: { email, password },
      }),
    login: (email: string, password: string) =>
      request<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      }),
    me: () => request<{ id: number; email: string }>('/auth/me'),
  },
  
  profile: {
    get: () => request<Profile>('/profile'),
    update: (data: Partial<Profile>) =>
      request<Profile>('/profile', { method: 'PUT', body: data }),
  },
  
  achievements: {
    list: () => request<Achievement[]>('/achievements'),
    create: (data: Omit<Achievement, 'id' | 'user_id'>) =>
      request<Achievement>('/achievements', { method: 'POST', body: data }),
    update: (id: number, data: Partial<Achievement>) =>
      request<Achievement>(`/achievements/${id}`, { method: 'PUT', body: data }),
    delete: (id: number) =>
      request<{ message: string }>(`/achievements/${id}`, { method: 'DELETE' }),
  },
  
  applications: {
    list: () => request<Application[]>('/applications'),
    create: (data: Omit<Application, 'id' | 'user_id' | 'created_at' | 'applied_at'>) =>
      request<Application>('/applications', { method: 'POST', body: data }),
    update: (id: number, data: Partial<Application>) =>
      request<Application>(`/applications/${id}`, { method: 'PUT', body: data }),
    delete: (id: number) =>
      request<{ message: string }>(`/applications/${id}`, { method: 'DELETE' }),
  },
  
  chat: {
    send: (message: string) =>
      request<{ response: string; achievement_extracted: Achievement | null }>('/chat', {
        method: 'POST',
        body: { message },
      }),
    history: () => request<{ messages: ChatMessage[] }>('/chat/history'),
    clear: () => request<{ message: string }>('/chat/history', { method: 'DELETE' }),
  },
  
  tailor: {
    analyze: (job_description: string) =>
      request<TailorResponse>('/tailor', {
        method: 'POST',
        body: { job_description },
      }),
  },
  
  resume: {
    extractProfile: (resume_text: string) =>
      request<ExtractedProfile>('/extract-profile', {
        method: 'POST',
        body: { resume_text },
      }),
  },
};

export interface Profile {
  id: number;
  user_id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  website: string | null;
  summary: string | null;
  branding_color: string;
  branding_font: string;
  target_roles: string[];
  values: string[];
}

export interface Achievement {
  id: number;
  user_id: number;
  core_task: string;
  impact_metric: string | null;
  skills_used: string[];
  tags: string[];
  company: string | null;
  role: string | null;
  year: number | null;
  verification_level: string;
}

export interface Application {
  id: number;
  user_id: number;
  job_title: string | null;
  company: string | null;
  job_url: string | null;
  job_description: string | null;
  status: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';
  match_score: number | null;
  notes: string | null;
  applied_at: string | null;
  created_at: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface TailorResponse {
  tailored_summary: string;
  selected_achievements: { id: number; relevance_reason: string }[];
  match_score: number;
  suggestions: string[];
}

export interface ExtractedProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  website: string | null;
  summary: string | null;
  target_roles: string[];
  error: string | null;
}
