import {
  FULL_DATA_DICTIONARY,
  MOCK_DATASETS,
  MOCK_CUSTOMERS,
  MOCK_FEATURE_SNAPSHOTS,
  MOCK_TRANSACTIONS,
  MOCK_NLP_MODELS,
  MOCK_NLP_EVALUATION,
  MOCK_MODEL_COMPARISON,
  MOCK_SHAP_WORKSPACE,
  MOCK_QA_RUNS,
  MOCK_QA_SCHEDULES,
  MOCK_QA_FINDINGS,
  MOCK_QA_TEST_CASES,
  MOCK_QA_MODULE_COVERAGE,
  QA_EXECUTION_MODES,
  buildCustomerFeatureSnapshot,
  mockClassifyText,
} from './mockData';

const envApiUrl = (import.meta as any).env?.VITE_API_URL;
const envShowcaseFlag = (import.meta as any).env?.VITE_SHOWCASE_MODE;
const BASE_URL = envApiUrl ? `${envApiUrl}/api` : '/api';

export type ConnectionMode = 'probing' | 'live' | 'showcase';

let connectionMode: ConnectionMode =
  envShowcaseFlag === 'true' || envShowcaseFlag === '1' ? 'showcase' : 'probing';
let probePromise: Promise<ConnectionMode> | null = null;
const modeListeners = new Set<(mode: ConnectionMode) => void>();

function setConnectionMode(next: ConnectionMode) {
  if (connectionMode !== next) {
    connectionMode = next;
    modeListeners.forEach((fn) => fn(next));
  }
}

export function getConnectionMode(): ConnectionMode {
  return connectionMode;
}

export function isShowcaseMode(): boolean {
  return connectionMode === 'showcase';
}

export function subscribeConnectionMode(listener: (mode: ConnectionMode) => void): () => void {
  modeListeners.add(listener);
  listener(connectionMode);
  return () => {
    modeListeners.delete(listener);
  };
}

async function ensureBackendProbe(): Promise<ConnectionMode> {
  if (connectionMode !== 'probing') {
    return connectionMode;
  }
  if (!probePromise) {
    probePromise = (async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${BASE_URL}/health`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timer);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && typeof data.status === 'string') {
            setConnectionMode('live');
            return 'live';
          }
        }
      } catch {
        // Backend unreachable (e.g. Vercel static SPA showcase)
      }
      setConnectionMode('showcase');
      return 'showcase';
    })();
  }
  return probePromise;
}

// ============================================================================
// STATEFUL CLIENT-SIDE SHOWCASE STORE (Persists edits across session)
// ============================================================================
function scoreFeaturesLocally(features: {
  payment_burden_ratio: number;
  expense_to_income_ratio: number;
  utility_regularity_score: number;
  net_cash_flow: number;
  income_variability?: number;
  data_completeness_score?: number;
}) {
  const dti = features.payment_burden_ratio ?? 0.2;
  const exp = features.expense_to_income_ratio ?? 0.5;
  const util = features.utility_regularity_score ?? 0.85;
  const cf = features.net_cash_flow ?? 2000000;
  const incVar = features.income_variability ?? 0.15;
  const comp = features.data_completeness_score ?? 1.0;

  const logit =
    -2.65 +
    dti * 3.6 +
    exp * 2.9 -
    util * 3.3 -
    Math.max(-1.2, Math.min(2.0, cf / 10_000_000)) * 1.45 +
    incVar * 1.1;

  const pd = Number(Math.max(0.01, Math.min(0.98, 1 / (1 + Math.exp(-logit)))).toFixed(4));
  let risk_category: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' = 'LOW';
  let recommendation: 'APPROVE_SUPPORTED' | 'REVIEW_RECOMMENDED' | 'CAUTION_FLAGGED' =
    'APPROVE_SUPPORTED';

  if (pd < 0.12) {
    risk_category = 'LOW';
    recommendation = 'APPROVE_SUPPORTED';
  } else if (pd < 0.35) {
    risk_category = 'MODERATE';
    recommendation = 'REVIEW_RECOMMENDED';
  } else if (pd < 0.65) {
    risk_category = 'HIGH';
    recommendation = 'CAUTION_FLAGGED';
  } else {
    risk_category = 'VERY_HIGH';
    recommendation = 'CAUTION_FLAGGED';
  }

  const uncertainty_score = Number(
    Math.max(0.02, Math.min(0.25, (1 - comp) * 0.2 + pd * (1 - pd) * 0.38)).toFixed(4)
  );

  // Exact probability-space additive contributions
  const base_value = 0.18;
  const raw = [
    { feature: 'utility_regularity_score', value: Number(util.toFixed(4)), rawW: -(util - 0.85) * 0.34 },
    { feature: 'payment_burden_ratio', value: Number(dti.toFixed(4)), rawW: (dti - 0.2) * 0.32 },
    { feature: 'expense_to_income_ratio', value: Number(exp.toFixed(4)), rawW: (exp - 0.5) * 0.26 },
    { feature: 'net_cash_flow', value: Math.round(cf), rawW: -(cf / 10_000_000 - 0.4) * 0.15 },
    { feature: 'income_variability', value: Number(incVar.toFixed(4)), rawW: (incVar - 0.15) * 0.11 },
    { feature: 'data_completeness_score', value: Number(comp.toFixed(4)), rawW: -(comp - 0.9) * 0.06 },
  ];
  const rawSum = raw.reduce((acc, r) => acc + r.rawW, 0);
  const delta = pd - base_value;
  const scale = Math.abs(rawSum) > 1e-6 ? delta / rawSum : 0;

  const waterfall_contributions = raw
    .map((r) => {
      const c = Number((r.rawW * scale).toFixed(4));
      return {
        feature: r.feature,
        value: r.value,
        contribution: c,
        direction: (c >= 0 ? 'INCREASES_RISK' : 'DECREASES_RISK') as
          | 'INCREASES_RISK'
          | 'DECREASES_RISK',
      };
    })
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    probability_of_default: pd,
    risk_category,
    recommendation,
    uncertainty_score,
    data_completeness: comp,
    base_value,
    waterfall_contributions,
  };
}

export { scoreFeaturesLocally };

const showcaseState = {
  datasets: [...MOCK_DATASETS],
  customers: MOCK_CUSTOMERS.map((c) => ({ ...c })),
  featureSnapshots: MOCK_FEATURE_SNAPSHOTS.map((f) => ({ ...f })),
  assessments: [
    {
      id: 'ass-mock-001',
      customer_id: 'cust-001',
      customer_code: 'CUST-A1F2-00001',
      feature_snapshot_id: 'feat-cust-001',
      model_version_id: 'LightGBM-Research-v2.0',
      probability_of_default: 0.048,
      risk_category: 'LOW',
      recommendation: 'APPROVE_SUPPORTED',
      uncertainty_score: 0.021,
      data_completeness: 1.0,
      review_status: 'REVIEWED_APPROVED',
      assessed_at: '2026-11-04T10:00:00Z',
      is_synthetic: 1,
    },
    {
      id: 'ass-mock-002',
      customer_id: 'cust-004',
      customer_code: 'CUST-A1F2-00004',
      feature_snapshot_id: 'feat-cust-004',
      model_version_id: 'LightGBM-Research-v2.0',
      probability_of_default: 0.562,
      risk_category: 'HIGH',
      recommendation: 'CAUTION_FLAGGED',
      uncertainty_score: 0.094,
      data_completeness: 1.0,
      review_status: 'PENDING_REVIEW',
      assessed_at: '2026-11-04T11:15:00Z',
      is_synthetic: 1,
    },
    {
      id: 'ass-mock-003',
      customer_id: 'cust-002',
      customer_code: 'CUST-A1F2-00002',
      feature_snapshot_id: 'feat-cust-002',
      model_version_id: 'LightGBM-Research-v2.0',
      probability_of_default: 0.168,
      risk_category: 'MODERATE',
      recommendation: 'REVIEW_RECOMMENDED',
      uncertainty_score: 0.058,
      data_completeness: 1.0,
      review_status: 'PENDING_REVIEW',
      assessed_at: '2026-11-04T11:45:00Z',
      is_synthetic: 1,
    },
  ] as any[],
  shapByAssessment: {
    'ass-mock-001': { ...MOCK_SHAP_WORKSPACE },
  } as Record<string, any>,
  monitoringEvents: [
    {
      id: 'ev-init-001',
      customer_id: 'cust-004',
      event_type: 'EXPENSE_SURGE',
      event_severity: 'HIGH',
      description: 'Simulated living expense shock of +35.0%',
      event_payload: JSON.stringify({ magnitude: 0.35 }),
      triggered_at: '2026-11-04T11:20:00Z',
      is_synthetic: 1,
    },
    {
      id: 'ev-init-002',
      customer_id: 'cust-006',
      event_type: 'MISSED_UTILITY',
      event_severity: 'HIGH',
      description: 'Simulated recurring utility delinquency (65 DPD PLN bill)',
      event_payload: JSON.stringify({ magnitude: 0.5 }),
      triggered_at: '2026-11-04T11:50:00Z',
      is_synthetic: 1,
    },
  ] as any[],
  timelineByCustomer: {
    'cust-001': [
      { id: 'tl-c1-1', customer_id: 'cust-001', probability_of_default: 0.041, risk_category: 'LOW', assessed_at: '2026-08-01T09:00:00Z' },
      { id: 'tl-c1-2', customer_id: 'cust-001', probability_of_default: 0.045, risk_category: 'LOW', assessed_at: '2026-09-15T09:00:00Z' },
      { id: 'tl-c1-3', customer_id: 'cust-001', probability_of_default: 0.048, risk_category: 'LOW', assessed_at: '2026-11-04T10:00:00Z' },
    ],
    'cust-004': [
      { id: 'tl-c4-1', customer_id: 'cust-004', probability_of_default: 0.312, risk_category: 'MODERATE', assessed_at: '2026-08-01T09:00:00Z' },
      { id: 'tl-c4-2', customer_id: 'cust-004', probability_of_default: 0.448, risk_category: 'HIGH', assessed_at: '2026-09-15T09:00:00Z' },
      { id: 'tl-c4-3', customer_id: 'cust-004', probability_of_default: 0.562, risk_category: 'HIGH', assessed_at: '2026-11-04T11:15:00Z' },
    ],
  } as Record<string, any[]>,
  auditLogs: [
    {
      id: 'aud-001',
      action_type: 'MODEL_TRAINED',
      entity_name: 'model_versions',
      entity_id: 'mod-lgb-v2',
      actor: 'MODEL_ORCHESTRATOR',
      details: JSON.stringify({ algorithm: 'LightGBM', version_tag: 'LightGBM-Research-v2.0', roc_auc: 0.914, split: 'STRATIFIED_HOLDOUT_75_25' }),
      timestamp: '2026-11-04T09:15:00Z',
    },
    {
      id: 'aud-002',
      action_type: 'DATASET_GENERATED',
      entity_name: 'research_datasets',
      entity_id: 'ds-seed-2026-alpha',
      actor: 'SYNTHETIC_DATA_LAB',
      details: JSON.stringify({ dataset_name: 'Research-Baseline-Dataset-v1', customers_count: 50, random_seed: 42, generator_version: 'v1.2.0-research' }),
      timestamp: '2026-11-04T08:40:00Z',
    },
    {
      id: 'aud-003',
      action_type: 'ASSESSMENT_CREATED',
      entity_name: 'credit_assessments',
      entity_id: 'ass-mock-001',
      actor: 'RESEARCH_RISK_ENGINE',
      details: JSON.stringify({ customer_code: 'CUST-A1F2-00001', pd: 0.048, category: 'LOW', recommendation: 'APPROVE_SUPPORTED' }),
      timestamp: '2026-11-04T10:00:00Z',
    },
    {
      id: 'aud-004',
      action_type: 'REASSESSMENT_TRIGGERED',
      entity_name: 'reassessment_history',
      entity_id: 'ev-init-001',
      actor: 'DYNAMIC_MONITORING_ENGINE',
      details: JSON.stringify({ customer_id: 'cust-004', event_type: 'EXPENSE_SURGE', prior_pd: 0.448, new_pd: 0.562, pd_delta: 0.114 }),
      timestamp: '2026-11-04T11:20:00Z',
    },
  ] as any[],
  qaRuns: MOCK_QA_RUNS.map((r) => ({ ...r })),
  qaFindings: MOCK_QA_FINDINGS.map((f) => ({ ...f })),
  qaSchedules: MOCK_QA_SCHEDULES.map((s) => ({ ...s })),
  qaTestCases: MOCK_QA_TEST_CASES.map((t) => ({ ...t })),
  modelsComparison: MOCK_MODEL_COMPARISON.map((m) => ({ ...m })),
};

export function generateShowcaseQaReport(format: 'json' | 'csv' | 'markdown', runId?: string): {
  filename: string;
  mimeType: string;
  content: string;
} {
  const run = showcaseState.qaRuns.find((r) => r.id === runId) || showcaseState.qaRuns[0];
  if (format === 'json') {
    return {
      filename: `qa_audit_report_${run.id.slice(0, 8)}.json`,
      mimeType: 'application/json',
      content: JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          mode: 'PORTFOLIO_SHOWCASE_SIMULATED',
          run,
          module_coverage: MOCK_QA_MODULE_COVERAGE,
          findings: showcaseState.qaFindings,
          test_cases: showcaseState.qaTestCases,
        },
        null,
        2
      ),
    };
  }
  if (format === 'csv') {
    const header = 'test_id,module_id,suite_mode,title,status,duration_ms,logs';
    const rows = showcaseState.qaTestCases.map((tc) =>
      [
        tc.test_id,
        tc.module_id,
        tc.suite_mode,
        `"${String(tc.title).replace(/"/g, '""')}"`,
        tc.status,
        tc.duration_ms,
        `"${String(tc.logs).replace(/"/g, '""')}"`,
      ].join(',')
    );
    return {
      filename: `qa_test_matrix_${run.id.slice(0, 8)}.csv`,
      mimeType: 'text/csv;charset=utf-8',
      content: [header, ...rows].join('\n'),
    };
  }
  const md = [
    `# Autonomous QA & Empirical Audit Report (${run.id})`,
    `- **Suite Mode:** ${run.suite_mode}`,
    `- **Status:** ${run.status}`,
    `- **Passed / Total:** ${run.passed_tests} / ${run.total_tests}`,
    `- **Commit:** ${run.commit_sha}`,
    '',
    '## Test Cases',
    '| Test ID | Module | Status | Duration (ms) | Title |',
    '|---|---|---|---|---|',
    ...showcaseState.qaTestCases.map(
      (tc) => `| ${tc.test_id} | ${tc.module_id} | ${tc.status} | ${tc.duration_ms} | ${tc.title} |`
    ),
    '',
    '## Tracked Findings',
    ...showcaseState.qaFindings.map(
      (f) => `- **${f.finding_code}** [${f.severity}] (${f.remediation_status}): ${f.title}`
    ),
  ].join('\n');
  return {
    filename: `qa_audit_report_${run.id.slice(0, 8)}.md`,
    mimeType: 'text/markdown;charset=utf-8',
    content: md,
  };
}

export function handleMockFallback(endpoint: string, options?: RequestInit): any {
  const method = (options?.method || 'GET').toUpperCase();
  let body: any = {};
  if (options?.body && typeof options.body === 'string') {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = {};
    }
  }

  // 1. Health & Overview
  if (endpoint.startsWith('/health')) {
    return {
      status: 'HEALTHY',
      service: 'AI Credit Risk Research & Dynamic Monitoring Platform',
      engine: 'Portfolio Showcase Mode (Client-Side Deterministic Engine)',
      database: 'In-Memory Synthetic Store (18-Table Schema Parity)',
      ports: { backend: 8240, frontend: 3240, ml_service: 8241 },
      disclaimer:
        'PORTFOLIO SHOWCASE MODE — DETERMINISTIC SYNTHETIC DATA ONLY — NO REAL LENDING DECISIONS',
      timestamp: new Date().toISOString(),
    };
  }

  if (endpoint.startsWith('/overview')) {
    const defaulted = showcaseState.customers.filter((c) => c.is_defaulted === 1).length;
    const defaultRate = Number(
      ((defaulted / Math.max(showcaseState.customers.length, 1)) * 100).toFixed(1)
    );
    const highAlerts = showcaseState.monitoringEvents.filter(
      (e) => e.event_severity === 'HIGH' || e.event_severity === 'CRITICAL'
    ).length;

    return {
      metrics: {
        total_synthetic_customers: Math.max(50, showcaseState.customers.length),
        total_transactions: 3175,
        total_datasets: showcaseState.datasets.length,
        total_assessments: showcaseState.assessments.length,
        default_rate_pct: defaultRate,
        active_monitoring_alerts: highAlerts,
      },
      model_status: {
        active_model: 'LightGBM-Research-v2.0',
        benchmark_model: 'XGBoost-Research-v2.0',
        nlp_pipeline: 'Word+Char TF-IDF + Indo-FinBERT Hybrid',
      },
      recent_monitoring_events: showcaseState.monitoringEvents.slice(0, 5),
      recent_assessments: showcaseState.assessments.slice(0, 5),
      environment: 'Portfolio Showcase (Simulated Synthetic Environment)',
    };
  }

  if (endpoint.startsWith('/audit-logs')) {
    return { logs: showcaseState.auditLogs };
  }

  // 2. Datasets
  if (endpoint.startsWith('/datasets')) {
    return { datasets: showcaseState.datasets };
  }

  if (endpoint.startsWith('/generator/generate') && method === 'POST') {
    const newCount = Number(body.customer_count) || 50;
    const seed = Number(body.random_seed) || 42;
    const profileType = body.profile_type || 'small';
    const newId = `ds-${Date.now()}`;
    const dsName = body.name || `Research-Dataset-${profileType}-${seed}`;
    const newDs = {
      id: newId,
      name: dsName,
      version: '1.0.0',
      description: `Synthetic research dataset with ${newCount} customers generated using seed ${seed}.`,
      profile_type: profileType,
      customer_count: newCount,
      random_seed: seed,
      generator_version: 'v1.2.0-research',
      data_dictionary: JSON.stringify(FULL_DATA_DICTIONARY),
      is_synthetic: 1,
      created_at: new Date().toISOString(),
    };
    showcaseState.datasets = [newDs, ...showcaseState.datasets];
    showcaseState.auditLogs = [
      {
        id: `aud-${Date.now()}`,
        action_type: 'DATASET_GENERATED',
        entity_name: 'research_datasets',
        entity_id: newId,
        actor: 'SYNTHETIC_DATA_LAB',
        details: JSON.stringify({ dataset_name: dsName, customers_count: newCount, random_seed: seed }),
        timestamp: new Date().toISOString(),
      },
      ...showcaseState.auditLogs,
    ];
    return {
      status: 'SUCCESS',
      dataset: newDs,
      summary: {
        dataset_id: newId,
        dataset_name: dsName,
        customers_generated: newCount,
        transactions_generated: newCount * 63,
        utilities_generated: newCount * 6,
        random_seed: seed,
        is_synthetic: 1,
      },
    };
  }

  // 3. Customers
  if (endpoint === '/customers' || endpoint.startsWith('/customers?')) {
    const url = new URL('http://dummy' + endpoint);
    const profile = url.searchParams.get('profile');
    const cohort = url.searchParams.get('cohort');
    const search = url.searchParams.get('search')?.toLowerCase();
    const page = Number(url.searchParams.get('page') || 1);
    const limit = Number(url.searchParams.get('limit') || 50);

    let list = [...showcaseState.customers];
    if (profile && profile !== 'ALL') {
      list = list.filter((c) => c.simulation_profile.toLowerCase() === profile.toLowerCase());
    }
    if (cohort && cohort !== 'ALL') {
      list = list.filter((c) => c.synthetic_cohort.toLowerCase() === cohort.toLowerCase());
    }
    if (search) {
      list = list.filter(
        (c) =>
          c.customer_code.toLowerCase().includes(search) ||
          c.simulation_profile.toLowerCase().includes(search) ||
          c.employment_type.toLowerCase().includes(search)
      );
    }
    const start = (page - 1) * limit;
    return {
      customers: list.slice(start, start + limit),
      pagination: { total: list.length, page, limit },
    };
  }

  if (endpoint.match(/^\/customers\/[^/?]+/)) {
    const custId = endpoint.split('/')[2];
    const found =
      showcaseState.customers.find((c) => c.id === custId || c.customer_code === custId) ||
      showcaseState.customers[0];
    const snap =
      showcaseState.featureSnapshots.find((f) => f.customer_id === found.id) ||
      buildCustomerFeatureSnapshot(found);
    const isDelinquent =
      found.simulation_profile === 'High Expense Burden' ||
      found.simulation_profile === 'Irregular Payment';
    return {
      customer: found,
      accounts: [
        {
          id: `acc-${found.id}`,
          customer_id: found.id,
          account_number: `SYNTH-A1F2-${found.customer_code.slice(-4)}`,
          account_type: 'Checking/Savings',
          current_balance: snap.avg_balance,
          currency: 'IDR',
          status: 'ACTIVE',
          is_synthetic: 1,
        },
      ],
      feature_snapshots: [snap],
      transactions: MOCK_TRANSACTIONS.map((t, idx) => ({
        ...t,
        id: `${t.id}-${found.id}`,
        customer_id: found.id,
        amount: idx === 0 ? found.monthly_income : Math.round((found.stated_monthly_expenses / 5) * (0.8 + idx * 0.1)),
      })),
      utility_payments: [
        {
          id: `u1-${found.id}`,
          customer_id: found.id,
          utility_type: 'Electricity (PLN)',
          billing_period: '2026-10',
          bill_amount: 650000,
          paid_amount: isDelinquent ? 0 : 650000,
          payment_status: isDelinquent ? 'MISSED' : 'ON_TIME',
          days_past_due: isDelinquent ? 65 : 0,
        },
        {
          id: `u2-${found.id}`,
          customer_id: found.id,
          utility_type: 'Water (PDAM)',
          billing_period: '2026-09',
          bill_amount: 240000,
          paid_amount: 240000,
          payment_status: isDelinquent ? 'LATE' : 'ON_TIME',
          days_past_due: isDelinquent ? 18 : 0,
        },
        {
          id: `u3-${found.id}`,
          customer_id: found.id,
          utility_type: 'Electricity (PLN)',
          billing_period: '2026-08',
          bill_amount: 610000,
          paid_amount: 610000,
          payment_status: 'ON_TIME',
          days_past_due: 0,
        },
      ],
    };
  }

  // 4. Transactions & Features
  if (endpoint.startsWith('/transactions')) {
    return { transactions: MOCK_TRANSACTIONS };
  }

  if (endpoint.startsWith('/features/compute/') && method === 'POST') {
    const custId = endpoint.split('/')[3];
    const found =
      showcaseState.customers.find((c) => c.id === custId) || showcaseState.customers[0];
    const snap = buildCustomerFeatureSnapshot(found);
    showcaseState.featureSnapshots = [
      snap,
      ...showcaseState.featureSnapshots.filter((f) => f.customer_id !== found.id),
    ];
    return { status: 'COMPUTED', feature_snapshot: snap };
  }

  if (endpoint.startsWith('/features')) {
    const url = new URL('http://dummy' + endpoint);
    const cid = url.searchParams.get('customer_id');
    const snaps = cid
      ? showcaseState.featureSnapshots.filter((f) => f.customer_id === cid)
      : showcaseState.featureSnapshots;
    return { feature_snapshots: snaps };
  }

  // 5. NLP
  if (endpoint.startsWith('/nlp/classify') && method === 'POST') {
    const descs: string[] = body.descriptions || (body.text ? [body.text] : []);
    const predictions = descs.map((d: string) => ({
      text: d,
      ...mockClassifyText(d),
    }));
    const unclassified = predictions.filter((p) => p.category === 'Unclassified').length;
    return {
      predictions,
      unclassified_rate: Number((unclassified / Math.max(predictions.length, 1)).toFixed(4)),
    };
  }

  if (endpoint.startsWith('/nlp/models')) {
    return { models: MOCK_NLP_MODELS };
  }

  if (endpoint.startsWith('/nlp/evaluate')) {
    return MOCK_NLP_EVALUATION;
  }

  // 6. Models
  if (endpoint.startsWith('/models/train') && method === 'POST') {
    const algo = body.algorithm || 'LightGBM';
    const seed = Number(body.random_seed) || 42;
    const hp = body.hyperparameters || {};
    const lr = Number(hp.learning_rate) || 0.05;
    const depth = Number(hp.max_depth) || 4;
    // Deterministic slight variance by seed & hyperparameters
    const delta = (((seed % 19) - 9) * 0.0012) + ((lr - 0.05) * -0.04) + ((depth - 4) * 0.002);
    const baseRoc = algo === 'XGBoost' ? 0.903 : algo === 'Baseline_LogReg' ? 0.848 : 0.914;
    const roc_auc = Number(Math.max(0.75, Math.min(0.96, baseRoc + delta)).toFixed(4));
    const pr_auc = Number(Math.max(0.7, Math.min(0.95, roc_auc - 0.042)).toFixed(4));
    const f1_score = Number(Math.max(0.65, Math.min(0.93, roc_auc - 0.072)).toFixed(4));
    const precision = Number(Math.max(0.68, Math.min(0.95, f1_score + 0.016)).toFixed(4));
    const recall = Number(Math.max(0.65, Math.min(0.94, f1_score - 0.014)).toFixed(4));
    const brier_score = Number(Math.max(0.05, Math.min(0.22, 0.25 - roc_auc * 0.175)).toFixed(4));
    const log_loss = Number(Math.max(0.18, Math.min(0.55, 0.72 - roc_auc * 0.47)).toFixed(4));

    const versionId = `mv-${algo.toLowerCase()}-${Date.now().toString(36)}`;
    const versionTag = `${algo}-v${(seed % 9) + 2}.${depth}`;

    showcaseState.auditLogs = [
      {
        id: `aud-${Date.now()}`,
        action_type: 'MODEL_TRAINED',
        entity_name: 'model_versions',
        entity_id: versionId,
        actor: 'MODEL_ORCHESTRATOR',
        details: JSON.stringify({ algorithm: algo, version_tag: versionTag, roc_auc, random_seed: seed }),
        timestamp: new Date().toISOString(),
      },
      ...showcaseState.auditLogs,
    ];

    return {
      status: 'TRAINED',
      model_version_id: versionId,
      version_tag: versionTag,
      algorithm: algo,
      evaluation: {
        roc_auc,
        pr_auc,
        f1_score,
        precision,
        recall,
        brier_score,
        log_loss,
      },
    };
  }

  if (endpoint.startsWith('/models/compare')) {
    return {
      comparison: showcaseState.modelsComparison,
      evaluation_criteria: [
        'Discrimination: ROC-AUC & PR-AUC',
        'Classification: Precision, Recall & F1-score',
        'Probabilistic Calibration: Brier Score & Log Loss',
        'Explainability: TreeSHAP / LinearSHAP Exact Compatibility',
        'Computational Efficiency: Inference Latency',
      ],
      disclaimer: 'Models evaluated on held-out synthetic validation splits (Portfolio Showcase).',
    };
  }

  if (endpoint.startsWith('/models')) {
    return { models: showcaseState.modelsComparison };
  }

  // 7. Assessments & Review
  if (endpoint.startsWith('/assessments/evaluate/') && method === 'POST') {
    const custId = endpoint.split('/')[3];
    const customer =
      showcaseState.customers.find((c) => c.id === custId) || showcaseState.customers[0];
    const snap =
      showcaseState.featureSnapshots.find((f) => f.customer_id === customer.id) ||
      buildCustomerFeatureSnapshot(customer);
    const scored = scoreFeaturesLocally(snap);
    const assessmentId = `ass-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const newAss = {
      id: assessmentId,
      customer_id: customer.id,
      customer_code: customer.customer_code,
      feature_snapshot_id: snap.id,
      model_version_id: 'LightGBM-Research-v2.0',
      probability_of_default: scored.probability_of_default,
      risk_category: scored.risk_category,
      recommendation: scored.recommendation,
      uncertainty_score: scored.uncertainty_score,
      data_completeness: scored.data_completeness,
      review_status: 'PENDING_REVIEW',
      assessed_at: nowIso,
      is_synthetic: 1,
    };

    showcaseState.assessments = [newAss, ...showcaseState.assessments];
    showcaseState.shapByAssessment[assessmentId] = {
      assessment_id: assessmentId,
      customer_id: customer.id,
      model_version: 'LightGBM-Research-v2.0',
      probability_of_default: scored.probability_of_default,
      risk_category: scored.risk_category,
      recommendation: scored.recommendation,
      base_value: scored.base_value,
      waterfall_contributions: scored.waterfall_contributions,
      global_importance_rank: MOCK_SHAP_WORKSPACE.global_importance_rank,
      feature_snapshot: snap,
    };
    const prevTl = showcaseState.timelineByCustomer[customer.id] || [];
    showcaseState.timelineByCustomer[customer.id] = [
      ...prevTl,
      {
        id: assessmentId,
        customer_id: customer.id,
        probability_of_default: scored.probability_of_default,
        risk_category: scored.risk_category,
        assessed_at: nowIso,
      },
    ];
    showcaseState.auditLogs = [
      {
        id: `aud-${Date.now()}`,
        action_type: 'ASSESSMENT_CREATED',
        entity_name: 'credit_assessments',
        entity_id: assessmentId,
        actor: 'RESEARCH_RISK_ENGINE',
        details: JSON.stringify({
          customer_code: customer.customer_code,
          pd: scored.probability_of_default,
          category: scored.risk_category,
        }),
        timestamp: nowIso,
      },
      ...showcaseState.auditLogs,
    ];

    return {
      status: 'ASSESSED',
      assessment_id: assessmentId,
      customer: {
        id: customer.id,
        code: customer.customer_code,
        profile: customer.simulation_profile,
      },
      output: {
        probability_of_default: scored.probability_of_default,
        risk_category: scored.risk_category,
        recommendation: scored.recommendation,
        uncertainty_score: scored.uncertainty_score,
        data_completeness: scored.data_completeness,
        model_version: 'LightGBM-Research-v2.0',
        assessed_at: nowIso,
      },
    };
  }

  if (endpoint.includes('/review') && method === 'POST') {
    const assessmentId = endpoint.split('/')[2];
    const action = body.action || 'CONFIRM';
    const newStatus =
      action === 'OVERRIDE'
        ? 'OVERRIDDEN'
        : action === 'REQUEST_DATA'
        ? 'DATA_REQUESTED'
        : 'REVIEWED_APPROVED';

    showcaseState.assessments = showcaseState.assessments.map((a) =>
      a.id === assessmentId
        ? {
            ...a,
            review_status: newStatus,
            recommendation:
              action === 'OVERRIDE' && body.override_decision
                ? body.override_decision
                : a.recommendation,
            reviewer_notes: `${body.reviewer_role || 'Underwriter'}: ${body.justification || ''}`,
          }
        : a
    );
    showcaseState.auditLogs = [
      {
        id: `aud-${Date.now()}`,
        action_type: action === 'OVERRIDE' ? 'DECISION_OVERRIDDEN' : 'REVIEW_RECORDED',
        entity_name: 'credit_assessments',
        entity_id: assessmentId,
        actor: body.reviewer_role || 'Senior Risk Underwriter',
        details: JSON.stringify({ action, new_review_status: newStatus, justification: body.justification }),
        timestamp: new Date().toISOString(),
      },
      ...showcaseState.auditLogs,
    ];
    return {
      status: 'REVIEW_RECORDED',
      assessment_id: assessmentId,
      new_review_status: newStatus,
    };
  }

  if (endpoint.startsWith('/assessments')) {
    return { assessments: showcaseState.assessments };
  }

  // 8. XAI
  if (endpoint.startsWith('/xai/shap/')) {
    const assessmentId = endpoint.split('/')[3];
    if (showcaseState.shapByAssessment[assessmentId]) {
      return showcaseState.shapByAssessment[assessmentId];
    }
    const ass = showcaseState.assessments.find((a) => a.id === assessmentId);
    if (ass) {
      const snap =
        showcaseState.featureSnapshots.find((f) => f.customer_id === ass.customer_id) ||
        MOCK_FEATURE_SNAPSHOTS[0];
      const scored = scoreFeaturesLocally(snap);
      return {
        assessment_id: ass.id,
        customer_id: ass.customer_id,
        model_version: ass.model_version_id || 'LightGBM-Research-v2.0',
        probability_of_default: ass.probability_of_default,
        risk_category: ass.risk_category,
        recommendation: ass.recommendation,
        base_value: scored.base_value,
        waterfall_contributions: scored.waterfall_contributions,
        global_importance_rank: MOCK_SHAP_WORKSPACE.global_importance_rank,
        feature_snapshot: snap,
      };
    }
    return MOCK_SHAP_WORKSPACE;
  }

  // 9. Monitoring
  if (endpoint.startsWith('/monitoring/simulate') && method === 'POST') {
    const custId = body.customer_id || showcaseState.customers[0].id;
    const evType = body.event_type || 'INCOME_DROP';
    const magPct = Math.max(5, Math.min(90, Number(body.magnitude_pct) || 35));
    const mag = magPct / 100;

    const customer =
      showcaseState.customers.find((c) => c.id === custId) || showcaseState.customers[0];
    const snap =
      showcaseState.featureSnapshots.find((f) => f.customer_id === customer.id) ||
      buildCustomerFeatureSnapshot(customer);

    const priorScored = scoreFeaturesLocally(snap);
    const tl = showcaseState.timelineByCustomer[customer.id] || [
      {
        id: `tl-base-${customer.id}`,
        customer_id: customer.id,
        probability_of_default: priorScored.probability_of_default,
        risk_category: priorScored.risk_category,
        assessed_at: '2026-10-15T09:00:00Z',
      },
    ];
    const priorPd = tl[tl.length - 1].probability_of_default;
    const priorCat = tl[tl.length - 1].risk_category;

    // Mutate snapshot realistically based on shock
    if (evType === 'INCOME_DROP') {
      snap.avg_monthly_income = Math.max(1_000_000, snap.avg_monthly_income * (1 - mag));
    } else if (evType === 'EXPENSE_SURGE') {
      snap.monthly_expense = snap.monthly_expense * (1 + mag);
    } else if (evType === 'MISSED_UTILITY') {
      snap.utility_regularity_score = Math.max(0.1, Number((snap.utility_regularity_score - mag * 0.65).toFixed(4)));
    }
    snap.net_cash_flow = snap.avg_monthly_income - snap.monthly_expense;
    snap.expense_to_income_ratio = Number(
      Math.min(2.5, snap.monthly_expense / Math.max(snap.avg_monthly_income, 1)).toFixed(4)
    );
    snap.payment_burden_ratio = Number(
      Math.min(2.0, customer.credit_obligation_amount / Math.max(snap.avg_monthly_income, 1)).toFixed(4)
    );

    const nextScored = scoreFeaturesLocally(snap);
    const newPd = Number(
      Math.min(0.98, Math.max(priorPd + 0.015, nextScored.probability_of_default)).toFixed(4)
    );
    const pdDelta = Number((newPd - priorPd).toFixed(4));
    const newCat =
      newPd < 0.12 ? 'LOW' : newPd < 0.35 ? 'MODERATE' : newPd < 0.65 ? 'HIGH' : 'VERY_HIGH';
    const severity = evType === 'EXPENSE_SURGE' && magPct < 45 ? 'MEDIUM' : 'HIGH';
    const triggerReason =
      evType === 'INCOME_DROP'
        ? `Simulated payroll income compression of ${magPct.toFixed(1)}%`
        : evType === 'EXPENSE_SURGE'
        ? `Simulated living expense shock of +${magPct.toFixed(1)}%`
        : `Simulated recurring utility delinquency (65 DPD, ${Math.max(2, Math.round(mag * 6))} missed cycles)`;

    const nowIso = new Date().toISOString();
    const reassessId = `reass-${Date.now().toString(36)}`;
    const eventId = `ev-${Date.now().toString(36)}`;

    showcaseState.timelineByCustomer[customer.id] = [
      ...tl,
      {
        id: reassessId,
        customer_id: customer.id,
        probability_of_default: newPd,
        risk_category: newCat,
        assessed_at: nowIso,
      },
    ];

    showcaseState.monitoringEvents = [
      {
        id: eventId,
        customer_id: customer.id,
        event_type: evType,
        event_severity: severity,
        description: triggerReason,
        event_payload: JSON.stringify({ magnitude: mag }),
        triggered_at: nowIso,
        is_synthetic: 1,
      },
      ...showcaseState.monitoringEvents,
    ];

    showcaseState.auditLogs = [
      {
        id: `aud-${Date.now()}`,
        action_type: 'REASSESSMENT_TRIGGERED',
        entity_name: 'reassessment_history',
        entity_id: reassessId,
        actor: 'DYNAMIC_MONITORING_ENGINE',
        details: JSON.stringify({
          customer_id: customer.id,
          event_type: evType,
          prior_pd: priorPd,
          new_pd: newPd,
          pd_delta: pdDelta,
        }),
        timestamp: nowIso,
      },
      ...showcaseState.auditLogs,
    ];

    return {
      status: 'REASSESSED',
      monitoring_event_id: eventId,
      event_type: evType,
      severity,
      reassessment: {
        id: reassessId,
        prior_pd: priorPd,
        new_pd: newPd,
        pd_delta: pdDelta,
        prior_risk_category: priorCat,
        new_risk_category: newCat,
        trigger_reason: triggerReason,
      },
    };
  }

  if (endpoint.startsWith('/monitoring/timeline/')) {
    const custId = endpoint.split('/')[3];
    const customer =
      showcaseState.customers.find((c) => c.id === custId) || showcaseState.customers[0];
    if (!showcaseState.timelineByCustomer[customer.id]) {
      const snap =
        showcaseState.featureSnapshots.find((f) => f.customer_id === customer.id) ||
        buildCustomerFeatureSnapshot(customer);
      const s = scoreFeaturesLocally(snap);
      showcaseState.timelineByCustomer[customer.id] = [
        {
          id: `tl-${customer.id}-1`,
          customer_id: customer.id,
          probability_of_default: Number(Math.max(0.01, s.probability_of_default - 0.012).toFixed(4)),
          risk_category: s.risk_category,
          assessed_at: '2026-09-01T09:00:00Z',
        },
        {
          id: `tl-${customer.id}-2`,
          customer_id: customer.id,
          probability_of_default: s.probability_of_default,
          risk_category: s.risk_category,
          assessed_at: '2026-11-04T10:00:00Z',
        },
      ];
    }
    return {
      customer_id: customer.id,
      assessment_timeline: showcaseState.timelineByCustomer[customer.id],
      monitoring_events: showcaseState.monitoringEvents.filter((e) => e.customer_id === customer.id),
      reassessment_history: [],
    };
  }

  if (endpoint.startsWith('/monitoring/events')) {
    return { monitoring_events: showcaseState.monitoringEvents };
  }

  if (endpoint.startsWith('/monitoring/drift')) {
    return {
      baseline_dataset: 'Research-Baseline-Dataset-v1',
      monitoring_window: 'Temporal Rolling Window (T-30D)',
      overall_stability: 'STABLE_WITH_WATCHLIST',
      feature_drift_metrics: [
        {
          feature: 'payment_burden_ratio',
          psi: 0.042,
          status: 'STABLE',
          interpretation: 'No significant drift (PSI < 0.10)',
        },
        {
          feature: 'utility_regularity_score',
          psi: 0.078,
          status: 'STABLE',
          interpretation: 'No significant drift (PSI < 0.10)',
        },
        {
          feature: 'expense_to_income_ratio',
          psi: 0.145,
          status: 'MODERATE_DRIFT',
          interpretation: 'Moderate distribution change detected (0.10 <= PSI < 0.25)',
        },
        {
          feature: 'net_cash_flow',
          psi: 0.064,
          status: 'STABLE',
          interpretation: 'No significant drift (PSI < 0.10)',
        },
        {
          feature: 'income_variability',
          psi: 0.051,
          status: 'STABLE',
          interpretation: 'No significant drift (PSI < 0.10)',
        },
      ],
      disclaimer:
        'PSI computed on synthetic customer distributions. Real-world drift requires non-synthetic temporal baselines.',
    };
  }

  // 10. Fairness
  if (endpoint.startsWith('/fairness')) {
    return {
      audit_version: 'Fairness-Research-Audit-v2.0',
      evaluated_model: 'LightGBM-Research-v2.0',
      cohort_metrics: [
        {
          cohort: 'Group_A (Audit Cohort 1)',
          sample_size: 18,
          approval_rate: 0.75,
          disparate_impact_ratio: 1.0,
          false_positive_rate: 0.062,
          false_negative_rate: 0.165,
          brier_calibration_score: 0.088,
          mean_data_completeness: 0.96,
        },
        {
          cohort: 'Group_B (Audit Cohort 2)',
          sample_size: 17,
          approval_rate: 0.72,
          disparate_impact_ratio: 0.96,
          false_positive_rate: 0.068,
          false_negative_rate: 0.181,
          brier_calibration_score: 0.094,
          mean_data_completeness: 0.93,
        },
        {
          cohort: 'Group_C (Audit Cohort 3)',
          sample_size: 15,
          approval_rate: 0.69,
          disparate_impact_ratio: 0.92,
          false_positive_rate: 0.071,
          false_negative_rate: 0.192,
          brier_calibration_score: 0.099,
          mean_data_completeness: 0.91,
        },
      ],
      parity_audit: {
        four_fifths_rule_status: 'COMPLIANT_IN_SIMULATION',
        min_disparate_impact_ratio: 0.92,
        max_fpr_disparity: 0.009,
        max_fnr_disparity: 0.027,
        equal_opportunity_difference: 0.027,
      },
      research_limitations: [
        'Synthetic Data Caveat: Fairness in synthetic cohort simulations is an experimental artifact and does NOT guarantee absence of real-world demographic bias.',
        'Strict Architectural Separation: Sensitive cohort markers are used SOLELY in this post-hoc research validation module and are strictly excluded from all training feature pipelines.',
        'Metric Trade-offs: Optimizing demographic parity simultaneously with equalized odds may introduce mathematical friction with calibration curves.',
        'Production Disclaimer: Not certified for production regulatory compliance without empirical production audits.',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // 11. Experiments
  if (endpoint.startsWith('/experiments')) {
    return {
      experiments: [
        {
          id: 'exp-lgbm-v2',
          name: 'LightGBM-OutOfTime-Holdout-75-25',
          model_version_id: 'LightGBM-Research-v2.0',
          status: 'COMPLETED',
          split_strategy: 'STRATIFIED_OUT_OF_TIME_75_25',
          started_at: '2026-11-04T09:10:00Z',
          completed_at: '2026-11-04T09:15:00Z',
          notes: 'Holdout ROC-AUC: 0.914, Brier: 0.089',
        },
      ],
    };
  }

  // 12. QA & Audit Dashboard
  if (endpoint.startsWith('/qa/overview')) {
    const latest = showcaseState.qaRuns[0];
    const passRate =
      latest.total_tests > 0
        ? Number(((latest.passed_tests / latest.total_tests) * 100).toFixed(1))
        : 0;
    const openFindings = showcaseState.qaFindings.filter(
      (f) => f.remediation_status === 'AWAITING_APPROVAL'
    );
    const crit = openFindings.filter((f) => f.severity === 'CRITICAL').length;
    const high = openFindings.filter((f) => f.severity === 'HIGH').length;
    const med = openFindings.filter((f) => f.severity === 'MEDIUM').length;
    const low = openFindings.filter((f) => f.severity === 'LOW').length;

    return {
      overall_health:
        latest.failed_tests === 0
          ? 'HEALTHY'
          : crit > 0
          ? 'CRITICAL_FAILURES'
          : 'ISSUES_DETECTED',
      latest_run: latest,
      summary_counts: {
        total_runs: showcaseState.qaRuns.length,
        latest_total_tests: latest.total_tests,
        latest_passed: latest.passed_tests,
        latest_failed: latest.failed_tests,
        latest_not_implemented: latest.not_implemented_count,
        latest_blocked: latest.blocked_tests,
        pass_rate_pct: passRate,
      },
      open_findings_by_severity: {
        critical: crit,
        high,
        medium: med,
        low,
        total: openFindings.length,
      },
      worker_status: {
        is_running: false,
        queue_depth: 0,
        active_run_id: null,
      },
      execution_modes: QA_EXECUTION_MODES,
      module_coverage: MOCK_QA_MODULE_COVERAGE,
    };
  }

  if (endpoint.startsWith('/qa/runs/compare')) {
    return {
      base_run_id: showcaseState.qaRuns[1]?.id || 'baseline',
      target_run_id: showcaseState.qaRuns[0]?.id || 'post-fix',
      pass_rate_delta_pct: 51.1,
      duration_delta_ms: -4319,
      newly_passing: [
        'SYNTH-005',
        'FEAT-002',
        'FEAT-003',
        'API-001',
        'API-003',
        'RISK-002',
        'MON-001',
        'MON-002',
        'DB-001',
        'DB-002',
        'AUD-001',
        'AUD-002',
        'SEC-001',
        'SEC-002',
        'UI-001',
        'PY-NLP-001',
        'PY-NLP-002',
        'PY-NLP-003',
        'PY-ML-002',
        'PY-ML-003',
        'PY-SHAP-002',
        'PY-SHAP-003',
        'PY-PSI-002',
        'PY-FAIR-001',
      ],
      newly_failing: [],
      persistent_failures: [],
    };
  }

  if (endpoint.startsWith('/qa/runs/trigger') && method === 'POST') {
    const newRunId = `run-sim-${Date.now().toString(36)}`;
    const suiteMode = body.suite_mode || 'complete_system_audit';
    const newRun = {
      ...showcaseState.qaRuns[0],
      id: newRunId,
      suite_mode: suiteMode,
      trigger_source: body.triggered_by || 'MANUAL_UI',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 1420,
    };
    showcaseState.qaRuns = [newRun, ...showcaseState.qaRuns];
    return { status: 'COMPLETED', run_id: newRunId, suite_mode: suiteMode };
  }

  if (endpoint.match(/^\/qa\/runs\/[^/]+\/retry/) && method === 'POST') {
    const newRunId = `run-retry-${Date.now().toString(36)}`;
    return { status: 'COMPLETED', run_id: newRunId };
  }

  if (endpoint.startsWith('/qa/runs')) {
    return { runs: showcaseState.qaRuns };
  }

  if (endpoint.startsWith('/qa/test-cases')) {
    const url = new URL('http://dummy' + endpoint);
    const mod = url.searchParams.get('module_id');
    const st = url.searchParams.get('status');
    const q = url.searchParams.get('search')?.toLowerCase();
    let list = [...showcaseState.qaTestCases];
    if (mod) list = list.filter((t) => t.module_id === mod);
    if (st) list = list.filter((t) => t.status === st);
    if (q) {
      list = list.filter(
        (t) =>
          t.test_id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.logs.toLowerCase().includes(q)
      );
    }
    return { test_cases: list };
  }

  if (endpoint.match(/^\/qa\/findings\/[^/]+\/remediation/) && method === 'POST') {
    const fId = endpoint.split('/')[3];
    const action = body.action || 'APPROVE';
    const statusMap: Record<string, string> = {
      APPROVE: 'APPROVED_FOR_MANUAL_PATCH',
      REJECT: 'REJECTED',
      DEFER: 'DEFERRED',
    };
    const nextStatus = statusMap[action] || 'APPROVED_FOR_MANUAL_PATCH';
    showcaseState.qaFindings = showcaseState.qaFindings.map((f) =>
      f.id === fId
        ? { ...f, remediation_status: nextStatus, reviewer_decision_notes: body.rationale }
        : f
    );
    return {
      remediation_status: nextStatus,
      note: 'Recorded in Showcase governance state.',
    };
  }

  if (endpoint.startsWith('/qa/findings')) {
    const url = new URL('http://dummy' + endpoint);
    const sev = url.searchParams.get('severity');
    const mod = url.searchParams.get('module_id');
    let list = [...showcaseState.qaFindings];
    if (sev) list = list.filter((f) => f.severity === sev);
    if (mod) list = list.filter((f) => f.module_id === mod);
    return { findings: list };
  }

  if (endpoint.startsWith('/qa/schedules') && method === 'POST') {
    showcaseState.qaSchedules = showcaseState.qaSchedules.map((s) =>
      s.id === body.id ? { ...s, enabled: body.enabled ? 1 : 0 } : s
    );
    return { status: 'UPDATED', schedules: showcaseState.qaSchedules };
  }

  if (endpoint.startsWith('/qa/schedules')) {
    return { schedules: showcaseState.qaSchedules };
  }

  return { status: 'OK', simulated: true };
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Fast-path: once Showcase Mode is active (or forced via VITE_SHOWCASE_MODE), emit ZERO HTTP requests
  const mode = await ensureBackendProbe();
  if (mode === 'showcase') {
    return handleMockFallback(endpoint, options) as T;
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return (await res.json()) as T;
    }

    // If backend returns a real 4xx validation error (like HTTP 400 empty justification), propagate it!
    if (res.status >= 400 && res.status < 500 && res.status !== 404) {
      const errText = await res.text();
      throw new Error(errText || `Request failed with status ${res.status}`);
    }

    // If 404 HTML or non-JSON (static SPA fallback), lock showcase mode
    if (!contentType.includes('application/json')) {
      setConnectionMode('showcase');
      return handleMockFallback(endpoint, options) as T;
    }
  } catch (err: any) {
    if (err instanceof Error && err.message && !err.message.includes('Failed to fetch') && err.name !== 'TypeError' && err.name !== 'AbortError') {
      throw err;
    }
    setConnectionMode('showcase');
  }

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
