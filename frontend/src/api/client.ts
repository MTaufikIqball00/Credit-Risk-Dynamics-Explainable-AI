import {
  MOCK_DATASETS,
  MOCK_CUSTOMERS,
  MOCK_FEATURES,
  MOCK_TRANSACTIONS,
  MOCK_MODELS,
  MOCK_SHAP_WORKSPACE,
  MOCK_QA_RUNS,
  MOCK_QA_SCHEDULES,
  MOCK_QA_FINDINGS,
  MOCK_QA_TEST_CASES,
  mockClassifyText,
} from './mockData';

const envApiUrl = (import.meta as any).env?.VITE_API_URL;
const BASE_URL = envApiUrl ? `${envApiUrl}/api` : '/api';

export function handleMockFallback(endpoint: string, options?: RequestInit): any {
  // 1. Health & Overview
  if (endpoint.startsWith('/health')) {
    return {
      status: 'HEALTHY',
      service: 'AI Credit Risk Research & Dynamic Monitoring Platform',
      engine: 'Rust (Axum + Tokio) & Python ML [Interactive Showcase Mode]',
      database: 'SQLite (WAL Mode - In-Memory Demo)',
      ports: { backend: 8240, frontend: 3240, ml_service: 8241 },
      disclaimer: 'Interactive Portfolio Showcase Mode — Deterministic Synthetic Data Only',
      timestamp: new Date().toISOString(),
    };
  }
  if (endpoint.startsWith('/overview')) {
    return {
      total_synthetic_customers: 50,
      total_datasets: 2,
      total_transactions: 3175,
      total_assessments: 42,
      default_rate_pct: 12.0,
      active_monitoring_alerts: 2,
      active_model_name: 'LightGBM-IndoCredit-Risk-Core',
      active_model_roc_auc: 0.9052,
      portfolio_risk_distribution: { LOW: 34, MODERATE: 10, HIGH: 4, VERY_HIGH: 2 },
    };
  }
  if (endpoint.startsWith('/audit-logs')) {
    return {
      logs: [
        { id: '1', action_type: 'MODEL_TRAINED', entity_id: 'mod-lgb-v1', actor: 'SYSTEM_WORKER', audit_notes: 'Trained LightGBM model with seed 42', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: '2', action_type: 'DATASET_GENERATED', entity_id: 'ds-seed-2026-alpha', actor: 'RESEARCHER', audit_notes: 'Generated 50 synthetic customers with ChaCha8', created_at: new Date(Date.now() - 7200000).toISOString() },
        { id: '3', action_type: 'ASSESSMENT_CREATED', entity_id: 'ass-mock-001', actor: 'UNDERWRITER', audit_notes: 'Evaluated CUST-00001 (PD: 0.048, LOW)', created_at: new Date(Date.now() - 10800000).toISOString() },
      ],
    };
  }

  // 2. Datasets
  if (endpoint.startsWith('/datasets')) {
    return { datasets: MOCK_DATASETS };
  }
  if (endpoint.startsWith('/generator/generate')) {
    let body: any = {};
    try { body = JSON.parse((options?.body as string) || '{}'); } catch {}
    const newCount = body.customer_count || 50;
    return {
      status: 'SUCCESS',
      summary: {
        dataset_id: 'ds-' + Date.now(),
        dataset_name: body.name || `Cohort-Seed-${body.random_seed || 42}`,
        customers_generated: newCount,
        profiles_simulated: 8,
        time_horizon_months: 6,
        is_synthetic: 1,
      },
    };
  }

  // 3. Customers
  if (endpoint.startsWith('/customers?')) {
    const url = new URL('http://dummy' + endpoint);
    const profile = url.searchParams.get('profile');
    const search = url.searchParams.get('search')?.toLowerCase();
    let list = [...MOCK_CUSTOMERS];
    if (profile && profile !== 'ALL') {
      list = list.filter((c) => c.simulation_profile.toLowerCase() === profile.toLowerCase());
    }
    if (search) {
      list = list.filter(
        (c) => c.customer_code.toLowerCase().includes(search) || c.simulation_profile.toLowerCase().includes(search)
      );
    }
    return {
      customers: list,
      pagination: { total: list.length, page: 1, limit: 50 },
    };
  }
  if (endpoint.match(/\/customers\/[^\/?]+/)) {
    const custId = endpoint.split('/')[2];
    const found = MOCK_CUSTOMERS.find((c) => c.id === custId || c.customer_code === custId) || MOCK_CUSTOMERS[0];
    return {
      customer: found,
      account: { account_number: 'SYNTH-0010-0001', current_balance: 24500000, status: 'ACTIVE' },
      features: MOCK_FEATURES,
      transactions: MOCK_TRANSACTIONS,
      utilities: [
        { utility_type: 'ELECTRICITY', billing_period: '2026-10', bill_amount: 850000, payment_status: 'ON_TIME', days_past_due: 0 },
        { utility_type: 'WATER', billing_period: '2026-10', bill_amount: 240000, payment_status: 'ON_TIME', days_past_due: 0 },
      ],
    };
  }

  // 4. Transactions & Features
  if (endpoint.startsWith('/transactions')) {
    return { transactions: MOCK_TRANSACTIONS };
  }
  if (endpoint.startsWith('/features/compute')) {
    return { status: 'SUCCESS', features: MOCK_FEATURES };
  }
  if (endpoint.startsWith('/features')) {
    return { features: MOCK_FEATURES };
  }

  // 5. NLP
  if (endpoint.startsWith('/nlp/classify')) {
    let body: any = {};
    try { body = JSON.parse((options?.body as string) || '{}'); } catch {}
    const descs = body.descriptions || [];
    return {
      classifications: descs.map((d: string) => ({
        text: d,
        ...mockClassifyText(d),
      })),
    };
  }
  if (endpoint.startsWith('/nlp/models')) {
    return { active_model: 'TF-IDF-Logistic-IndoFin-v2.0', accuracy: 0.945, classes_count: 11 };
  }
  if (endpoint.startsWith('/nlp/evaluate')) {
    return {
      accuracy: 0.945,
      macro_f1: 0.923,
      held_out_test_size: 55,
      per_class_f1: {
        'Salary / Income': 0.98,
        'Utility Payment': 0.96,
        'Loan Repayment': 0.97,
        'Groceries': 0.95,
        'Transportation': 0.96,
        'Business Revenue': 0.94,
      },
    };
  }

  // 6. Models
  if (endpoint.startsWith('/models/train')) {
    let body: any = {};
    try { body = JSON.parse((options?.body as string) || '{}'); } catch {}
    const algo = body.algorithm || 'LightGBM';
    return {
      status: 'SUCCESS',
      algorithm: algo,
      metrics: {
        roc_auc: algo === 'XGBoost' ? 0.8985 : 0.9052,
        pr_auc: 0.864,
        f1_score: 0.835,
        brier_score: 0.0192,
        ks_statistic: 0.672,
      },
    };
  }
  if (endpoint.startsWith('/models/compare')) {
    return { comparison: MOCK_MODELS };
  }
  if (endpoint.startsWith('/models')) {
    return { models: MOCK_MODELS };
  }

  // 7. Assessments & Review
  if (endpoint.startsWith('/assessments/evaluate')) {
    return {
      status: 'SUCCESS',
      assessment_id: 'ass-mock-001',
      output: {
        probability_of_default: 0.048,
        risk_category: 'LOW',
        recommendation: 'APPROVE_SUPPORTED',
        uncertainty_score: 0.021,
        data_completeness: 1.0,
      },
    };
  }
  if (endpoint.includes('/review')) {
    return { status: 'REVIEW_RECORDED', new_review_status: 'REVIEWED_APPROVED' };
  }
  if (endpoint.startsWith('/assessments')) {
    return {
      assessments: [
        {
          id: 'ass-mock-001',
          customer_id: 'cust-001',
          customer_code: 'CUST-00001',
          probability_of_default: 0.048,
          risk_category: 'LOW',
          recommendation: 'APPROVE_SUPPORTED',
          review_status: 'REVIEWED_APPROVED',
          assessed_at: '2026-11-04T12:00:00Z',
        },
        {
          id: 'ass-mock-002',
          customer_id: 'cust-003',
          customer_code: 'CUST-00003',
          probability_of_default: 0.425,
          risk_category: 'HIGH',
          recommendation: 'CAUTION_FLAGGED',
          review_status: 'PENDING_REVIEW',
          assessed_at: '2026-11-04T12:15:00Z',
        },
      ],
    };
  }

  // 8. XAI
  if (endpoint.startsWith('/xai/shap')) {
    return MOCK_SHAP_WORKSPACE;
  }

  // 9. Monitoring
  if (endpoint.startsWith('/monitoring/simulate')) {
    let body: any = {};
    try { body = JSON.parse((options?.body as string) || '{}'); } catch {}
    const evType = body.event_type || 'INCOME_DROP';
    const delta = evType === 'INCOME_DROP' ? 0.042 : evType === 'EXPENSE_SURGE' ? 0.038 : 0.065;
    return {
      status: 'SUCCESS',
      reassessment: {
        id: 'reass-' + Date.now(),
        prior_pd: 0.048,
        new_pd: Number((0.048 + delta).toFixed(4)),
        pd_delta: delta,
        prior_risk_category: 'LOW',
        new_risk_category: delta > 0.05 ? 'MODERATE' : 'LOW',
        trigger_reason: `Simulated temporal stress: ${evType}`,
      },
    };
  }
  if (endpoint.startsWith('/monitoring/timeline')) {
    return {
      timeline: [
        { date: '2026-06', pd: 0.041, risk_category: 'LOW' },
        { date: '2026-07', pd: 0.043, risk_category: 'LOW' },
        { date: '2026-08', pd: 0.044, risk_category: 'LOW' },
        { date: '2026-09', pd: 0.046, risk_category: 'LOW' },
        { date: '2026-10', pd: 0.048, risk_category: 'LOW' },
      ],
    };
  }
  if (endpoint.startsWith('/monitoring/events')) {
    return {
      events: [
        { id: 'ev-1', event_type: 'SALARY_COMPRESSION', event_severity: 'MEDIUM', description: 'Simulated payroll compression of 20%', triggered_at: '2026-11-04T10:00:00Z' },
      ],
    };
  }
  if (endpoint.startsWith('/monitoring/drift')) {
    return {
      status: 'STABLE',
      overall_psi: 0.038,
      feature_drifts: [
        { feature_name: 'net_cash_flow', psi: 0.028, status: 'STABLE' },
        { feature_name: 'expense_to_income_ratio', psi: 0.041, status: 'STABLE' },
        { feature_name: 'utility_regularity_score', psi: 0.015, status: 'STABLE' },
        { feature_name: 'payment_burden_ratio', psi: 0.033, status: 'STABLE' },
      ],
    };
  }

  // 10. Fairness
  if (endpoint.startsWith('/fairness')) {
    return {
      sensitive_in_features: false,
      disparate_impact_ratio: 0.92,
      cohorts_evaluated: 3,
      fairness_metrics: [
        { cohort: 'Group_A', sample_size: 20, approval_rate: 0.75, false_positive_rate: 0.12, false_negative_rate: 0.22, disparate_impact_ratio: 1.0 },
        { cohort: 'Group_B', sample_size: 18, approval_rate: 0.72, false_positive_rate: 0.11, false_negative_rate: 0.25, disparate_impact_ratio: 0.96 },
        { cohort: 'Group_C', sample_size: 12, approval_rate: 0.69, false_positive_rate: 0.14, false_negative_rate: 0.28, disparate_impact_ratio: 0.92 },
      ],
    };
  }

  // 11. Experiments
  if (endpoint.startsWith('/experiments')) {
    return {
      experiments: [
        { id: 'exp-1', name: 'Baseline-LGBM-Hyperopt', algorithm: 'LightGBM', created_at: '2026-11-01T10:00:00Z', metrics: { roc_auc: 0.9052 } },
      ],
    };
  }

  // 12. QA & Audit Dashboard
  if (endpoint.startsWith('/qa/overview')) {
    return {
      latest_run: MOCK_QA_RUNS[0],
      findings_count: { total_open: 24, critical: 2, high: 6, medium: 13, low: 3 },
    };
  }
  if (endpoint.startsWith('/qa/runs/compare')) {
    return {
      base_run_id: 'd807abb6-0dc7-48f6-98ab-5a3cf4c0d184',
      target_run_id: '5bc9735a-5123-40d6-bef8-c6783931cb57',
      status: 'VERIFIED',
      fixed_tests: ['UI-E2E-002'],
      regressed_tests: [],
      newly_failing_tests: [],
      pass_count_delta: 1,
      total_tests: 47,
    };
  }
  if (endpoint.startsWith('/qa/runs/trigger')) {
    return { status: 'QUEUED', run_id: '5bc9735a-5123-40d6-bef8-c6783931cb57', suite_mode: 'complete_system_audit' };
  }
  if (endpoint.startsWith('/qa/runs')) {
    return { runs: MOCK_QA_RUNS };
  }
  if (endpoint.startsWith('/qa/test-cases')) {
    return { test_cases: MOCK_QA_TEST_CASES };
  }
  if (endpoint.startsWith('/qa/findings')) {
    return { findings: MOCK_QA_FINDINGS };
  }
  if (endpoint.startsWith('/qa/schedules')) {
    return { schedules: MOCK_QA_SCHEDULES };
  }

  return { status: 'OK', simulated: true };
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch (err) {
    // Graceful fallback to client-side simulated data for portfolio showcase
  }

  // Fallback to interactive mock data
  return handleMockFallback(endpoint, options) as T;
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
  reviewAssessment: (
    id: string,
    payload: {
      reviewer_role: string;
      action: string;
      override_decision?: string;
      justification: string;
      audit_notes?: string;
    }
  ) =>
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
