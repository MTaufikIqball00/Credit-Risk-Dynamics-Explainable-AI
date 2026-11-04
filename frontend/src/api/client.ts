const BASE_URL = '/api';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => 'Unknown network error');
    throw new Error(`API Error [${res.status}]: ${errorBody}`);
  }

  return res.json();
}

export const api = {
  // System & Overview
  getHealth: () => fetchApi<any>('/health'),
  getOverview: () => fetchApi<any>('/overview'),
  getAuditLogs: (limit = 50) => fetchApi<any>(`/audit-logs?limit=${limit}`),

  // Datasets
  getDatasets: () => fetchApi<any>('/datasets'),
  generateDataset: (params: { profile_type: string; customer_count: number; random_seed: number; name?: string }) =>
    fetchApi<any>('/generator/generate', { method: 'POST', body: JSON.stringify(params) }),

  // Customers & Ingestion
  getCustomers: (params?: { page?: number; limit?: number; profile?: string; cohort?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    if (params?.profile) q.set('profile', params.profile);
    if (params?.cohort) q.set('cohort', params.cohort);
    if (params?.search) q.set('search', params.search);
    return fetchApi<any>(`/customers?${q.toString()}`);
  },
  getCustomerDetail: (id: string) => fetchApi<any>(`/customers/${id}`),

  // Transactions & Features
  getTransactions: (customerId?: string, limit = 50) =>
    fetchApi<any>(`/transactions?${customerId ? `customer_id=${customerId}&` : ''}limit=${limit}`),
  getFeatures: (customerId?: string) =>
    fetchApi<any>(`/features?${customerId ? `customer_id=${customerId}` : ''}`),
  computeFeatures: (customerId: string) =>
    fetchApi<any>(`/features/compute/${customerId}`, { method: 'POST' }),

  // NLP
  classifyNlp: (descriptions: string[]) =>
    fetchApi<any>('/nlp/classify', { method: 'POST', body: JSON.stringify({ descriptions }) }),
  getNlpModels: () => fetchApi<any>('/nlp/models'),
  getNlpEvaluation: () => fetchApi<any>('/nlp/evaluate'),

  // Models
  getModels: () => fetchApi<any>('/models'),
  trainModel: (params: { algorithm: string; dataset_id?: string; hyperparameters?: any; random_seed?: number }) =>
    fetchApi<any>('/models/train', { method: 'POST', body: JSON.stringify(params) }),
  compareModels: () => fetchApi<any>('/models/compare'),

  // Credit Assessments & Review
  getAssessments: (customerId?: string) =>
    fetchApi<any>(`/assessments?${customerId ? `customer_id=${customerId}` : ''}`),
  evaluateCustomer: (customerId: string) =>
    fetchApi<any>(`/assessments/evaluate/${customerId}`, { method: 'POST' }),
  getAssessmentDetail: (id: string) => fetchApi<any>(`/assessments/${id}`),
  reviewAssessment: (id: string, payload: { reviewer_role: string; action: string; override_decision?: string; justification: string; audit_notes?: string }) =>
    fetchApi<any>(`/assessments/${id}/review`, { method: 'POST', body: JSON.stringify(payload) }),

  // XAI
  getShapWorkspace: (assessmentId: string) => fetchApi<any>(`/xai/shap/${assessmentId}`),

  // Dynamic Monitoring & Drift
  getMonitoringEvents: (customerId?: string) =>
    fetchApi<any>(`/monitoring/events?${customerId ? `customer_id=${customerId}` : ''}`),
  simulateTemporalEvent: (params: { customer_id: string; event_type: string; magnitude_pct?: number }) =>
    fetchApi<any>('/monitoring/simulate', { method: 'POST', body: JSON.stringify(params) }),
  getMonitoringTimeline: (customerId: string) =>
    fetchApi<any>(`/monitoring/timeline/${customerId}`),
  getDriftReport: () => fetchApi<any>('/monitoring/drift'),

  // Fairness & Validation
  getFairnessReport: () => fetchApi<any>('/fairness/report'),

  // Experiments
  getExperiments: () => fetchApi<any>('/experiments'),

  // Autonomous QA & Empirical Audit Engine
  getQaOverview: () => fetchApi<any>('/qa/overview'),
  getQaRuns: () => fetchApi<any>('/qa/runs'),
  getQaRunDetail: (runId: string) => fetchApi<any>(`/qa/runs/${runId}`),
  triggerQaRun: (suite_mode: string, triggered_by = 'MANUAL_UI') =>
    fetchApi<any>('/qa/runs/trigger', {
      method: 'POST',
      body: JSON.stringify({ suite_mode, triggered_by }),
    }),
  cancelQaRun: (runId: string) =>
    fetchApi<any>(`/qa/runs/${runId}/cancel`, { method: 'POST' }),
  retryQaRun: (runId: string) =>
    fetchApi<any>(`/qa/runs/${runId}/retry`, { method: 'POST' }),
  compareQaRuns: (baseId: string, targetId: string) =>
    fetchApi<any>(`/qa/runs/compare?base_id=${encodeURIComponent(baseId)}&target_id=${encodeURIComponent(targetId)}`),
  getQaTestCases: (params?: {
    run_id?: string;
    suite_mode?: string;
    module_id?: string;
    status?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.run_id) q.set('run_id', params.run_id);
    if (params?.suite_mode) q.set('suite_mode', params.suite_mode);
    if (params?.module_id) q.set('module_id', params.module_id);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    return fetchApi<any>(`/qa/test-cases?${q.toString()}`);
  },
  getQaFindings: (params?: { run_id?: string; severity?: string; module_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.run_id) q.set('run_id', params.run_id);
    if (params?.severity) q.set('severity', params.severity);
    if (params?.module_id) q.set('module_id', params.module_id);
    return fetchApi<any>(`/qa/findings?${q.toString()}`);
  },
  submitRemediationDecision: (
    findingId: string,
    payload: { action: 'APPROVE' | 'REJECT' | 'DEFER'; actor?: string; rationale: string }
  ) =>
    fetchApi<any>(`/qa/findings/${findingId}/remediation`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getQaSchedules: () => fetchApi<any>('/qa/schedules'),
  updateQaSchedule: (payload: {
    id: string;
    enabled: boolean;
    interval_seconds?: number;
    suite_mode?: string;
  }) =>
    fetchApi<any>('/qa/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
