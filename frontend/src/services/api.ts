const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('aicte_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type if sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorDetail = response.statusText;
    }
    throw new ApiError(response.status, errorDetail);
  }

  // If response is a downloadable blob or text, handle appropriately
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text() as unknown as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request<any>('/auth/me'),
  switchDemoRole: (role: string) =>
    request<any>(`/auth/switch-demo-role/${role}`, { method: 'POST' }),

  // Applications
  getApplications: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params || {}).toString();
    return request<any[]>(`/applications${query ? `?${query}` : ''}`);
  },
  getApplication: (id: number) => request<any>(`/applications/${id}`),
  createApplication: (data: any) =>
    request<any>('/applications', { method: 'POST', body: JSON.stringify(data) }),
  updateApplication: (id: number, data: any) =>
    request<any>(`/applications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  submitApplication: (id: number) =>
    request<any>(`/applications/${id}/submit`, { method: 'POST' }),
  recordDecision: (id: number, decision: string, notes: string) =>
    request<any>(`/applications/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    }),
  deleteApplication: (id: number) =>
    request<any>(`/applications/${id}`, { method: 'DELETE' }),

  // Documents
  uploadDocument: (appId: number, documentType: string, file: File) => {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);
    return request<any>(`/applications/${appId}/documents`, {
      method: 'POST',
      body: formData,
    });
  },
  getDocument: (id: number) => request<any>(`/documents/${id}`),
  updateDocumentCorrections: (id: number, corrections: Record<string, any>) =>
    request<any>(`/documents/${id}/corrections`, {
      method: 'PUT',
      body: JSON.stringify(corrections),
    }),
  deleteDocument: (id: number) => request<any>(`/documents/${id}`, { method: 'DELETE' }),

  // Validation
  runValidation: (appId: number) =>
    request<any>(`/validation/applications/${appId}/run`, { method: 'POST' }),
  updateFinding: (findingId: number, update: { status?: string; reviewer_comment?: string; reviewer_decision?: string }) =>
    request<any>(`/validation/findings/${findingId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    }),

  // Verification
  getVerifications: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params || {}).toString();
    return request<any[]>(`/verification${query ? `?${query}` : ''}`);
  },
  verifyDocument: (id: number) =>
    request<any>(`/verification/${id}/verify`, { method: 'POST' }),
  updateVerificationNotes: (id: number, notes: string) =>
    request<any>(`/verification/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ reviewer_notes: notes }),
    }),

  // Compliance
  getComplianceRules: () => request<any[]>('/compliance/rules'),
  createComplianceRule: (rule: any) =>
    request<any>('/compliance/rules', { method: 'POST', body: JSON.stringify(rule) }),
  updateComplianceRule: (id: number, rule: any) =>
    request<any>(`/compliance/rules/${id}`, { method: 'PUT', body: JSON.stringify(rule) }),
  getApplicationCompliance: (appId: number) =>
    request<any[]>(`/compliance/applications/${appId}`),
  updateComplianceItem: (id: number, data: any) =>
    request<any>(`/compliance/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Anomalies
  getAnomalies: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params || {}).toString();
    return request<any[]>(`/anomalies${query ? `?${query}` : ''}`);
  },
  recordAnomalyDecision: (docId: number, decision: string, notes: string) =>
    request<any>(`/anomalies/${docId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    }),

  // Reports
  getAnalytics: () => request<any>('/reports/analytics'),
  getPrintableReport: (appId: number) => request<any>(`/reports/validation/${appId}`),

  // Audit
  getAuditTrail: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params || {}).toString();
    return request<any[]>(`/audit${query ? `?${query}` : ''}`);
  },

  // Settings
  getSettings: () => request<any>('/settings'),
  resetDemoData: (confirm: boolean = true) =>
    request<any>('/settings/reset-demo', {
      method: 'POST',
      body: JSON.stringify({ confirm }),
    }),
};
