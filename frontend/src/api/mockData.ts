// Rich Realistic Mock Data for Interactive Portfolio Showcase Mode
// This file allows the platform to run seamlessly as a standalone static SPA on Vercel without a backend server.

export const MOCK_DATASETS = [
  {
    id: 'ds-seed-2026-alpha',
    name: 'ChaCha8-Deterministic-Cohort-Alpha',
    version: '1.0.0',
    description: 'Controlled research cohort with 50 synthetic customers across 8 behavioral profiles.',
    profile_type: 'small',
    customer_count: 50,
    random_seed: 42,
    generator_version: 'ChaCha8-Core-v1.4',
    data_dictionary: JSON.stringify({ features: 12, categories: 11, time_horizon_months: 6 }),
    is_synthetic: 1,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'ds-seed-2026-beta',
    name: 'Stress-Testing-Cohort-Beta',
    version: '1.1.0',
    description: 'Expanded cohort of 150 customers used for dynamic shock injection and drift surveillance.',
    profile_type: 'medium',
    customer_count: 150,
    random_seed: 101,
    generator_version: 'ChaCha8-Core-v1.4',
    data_dictionary: JSON.stringify({ features: 12, categories: 11, time_horizon_months: 6 }),
    is_synthetic: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MOCK_CUSTOMERS = [
  {
    id: 'cust-001',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-00001',
    simulation_profile: 'Stable Income',
    employment_type: 'PERMANENT_SALARIED',
    monthly_income: 18500000,
    stated_monthly_expenses: 7200000,
    credit_obligation_amount: 2500000,
    existing_credit_lines: 2,
    credit_history_months: 48,
    synthetic_cohort: 'Group_A',
    is_defaulted: 0,
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-002',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-00002',
    simulation_profile: 'Volatile Informal',
    employment_type: 'GIG_FREELANCE',
    monthly_income: 9800000,
    stated_monthly_expenses: 6900000,
    credit_obligation_amount: 1800000,
    existing_credit_lines: 1,
    credit_history_months: 18,
    synthetic_cohort: 'Group_B',
    is_defaulted: 0,
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-003',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-00003',
    simulation_profile: 'High Burden Stressed',
    employment_type: 'CONTRACT',
    monthly_income: 12000000,
    stated_monthly_expenses: 10400000,
    credit_obligation_amount: 4500000,
    existing_credit_lines: 4,
    credit_history_months: 36,
    synthetic_cohort: 'Group_A',
    is_defaulted: 1,
    default_reason: 'Total expenses exceeded 85% with debt service ratio > 37%',
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-004',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-00004',
    simulation_profile: 'Delinquent Utility',
    employment_type: 'SELF_EMPLOYED',
    monthly_income: 14500000,
    stated_monthly_expenses: 9800000,
    credit_obligation_amount: 2100000,
    existing_credit_lines: 2,
    credit_history_months: 24,
    synthetic_cohort: 'Group_C',
    is_defaulted: 1,
    default_reason: 'Utility DPD reached 95 days with 3 missed cycles',
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-005',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-00005',
    simulation_profile: 'Affluent Conservative',
    employment_type: 'PROFESSIONAL',
    monthly_income: 38000000,
    stated_monthly_expenses: 11500000,
    credit_obligation_amount: 3000000,
    existing_credit_lines: 2,
    credit_history_months: 72,
    synthetic_cohort: 'Group_B',
    is_defaulted: 0,
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-006',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-00006',
    simulation_profile: 'Thin-File Micro-Entrepreneur',
    employment_type: 'INFORMAL_COMMERCE',
    monthly_income: 8200000,
    stated_monthly_expenses: 5100000,
    credit_obligation_amount: 800000,
    existing_credit_lines: 1,
    credit_history_months: 8,
    synthetic_cohort: 'Group_C',
    is_defaulted: 0,
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-007',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-00007',
    simulation_profile: 'Lifestyle Overleveraged',
    employment_type: 'PRIVATE_SECTOR',
    monthly_income: 16000000,
    stated_monthly_expenses: 14200000,
    credit_obligation_amount: 5200000,
    existing_credit_lines: 5,
    credit_history_months: 30,
    synthetic_cohort: 'Group_A',
    is_defaulted: 1,
    default_reason: 'Net cash flow negative for 3 consecutive months',
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-008',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-00008',
    simulation_profile: 'Prudent Saver',
    employment_type: 'CIVIL_SERVANT',
    monthly_income: 11000000,
    stated_monthly_expenses: 4800000,
    credit_obligation_amount: 1200000,
    existing_credit_lines: 1,
    credit_history_months: 60,
    synthetic_cohort: 'Group_B',
    is_defaulted: 0,
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
];

export const MOCK_FEATURES = {
  avg_monthly_income: 18500000,
  income_variability: 0.12,
  monthly_expense: 7200000,
  net_cash_flow: 11300000,
  avg_balance: 24500000,
  cash_flow_volatility: 0.18,
  expense_to_income_ratio: 0.389,
  recurring_payment_consistency: 0.96,
  utility_regularity_score: 0.98,
  payment_burden_ratio: 0.135,
  transaction_frequency: 18.5,
  data_completeness_score: 1.0,
};

export const MOCK_TRANSACTIONS = [
  {
    id: 'tx-001',
    account_id: 'acc-001',
    customer_id: 'cust-001',
    transaction_date: '2026-10-25 09:15:00',
    amount: 18500000,
    direction: 'CREDIT',
    raw_description: 'PAYROLL TRANSFER PT MANDIRI TEKNOLOGI SEJAHTERA',
    cleaned_description: 'payroll transfer pt mandiri teknologi sejahtera',
    running_balance: 32500000,
    is_synthetic: 1,
    created_at: '2026-10-25T09:15:00Z',
  },
  {
    id: 'tx-002',
    account_id: 'acc-001',
    customer_id: 'cust-001',
    transaction_date: '2026-10-26 14:22:00',
    amount: 2500000,
    direction: 'DEBIT',
    raw_description: 'AUTODEBIT KPR ANGSURAN BULANAN BANK MANDIRI',
    cleaned_description: 'autodebit kpr angsuran bulanan bank mandiri',
    running_balance: 30000000,
    is_synthetic: 1,
    created_at: '2026-10-26T14:22:00Z',
  },
  {
    id: 'tx-003',
    account_id: 'acc-001',
    customer_id: 'cust-001',
    transaction_date: '2026-10-28 11:05:00',
    amount: 1250000,
    direction: 'DEBIT',
    raw_description: 'TAGIHAN LISTRIK PLN & AIR PDAM KOTA JAKARTA',
    cleaned_description: 'tagihan listrik pln air pdam kota jakarta',
    running_balance: 28750000,
    is_synthetic: 1,
    created_at: '2026-10-28T11:05:00Z',
  },
  {
    id: 'tx-004',
    account_id: 'acc-001',
    customer_id: 'cust-001',
    transaction_date: '2026-10-30 19:40:00',
    amount: 1450000,
    direction: 'DEBIT',
    raw_description: 'BELANJA BULANAN SUPERMARKET GRAND LUCKY SCBD',
    cleaned_description: 'belanja bulanan supermarket grand lucky scbd',
    running_balance: 27300000,
    is_synthetic: 1,
    created_at: '2026-10-30T19:40:00Z',
  },
  {
    id: 'tx-005',
    account_id: 'acc-001',
    customer_id: 'cust-001',
    transaction_date: '2026-11-02 08:30:00',
    amount: 350000,
    direction: 'DEBIT',
    raw_description: 'BERLANGGANAN INTERNET INDIHOME FIBER 50MBPS',
    cleaned_description: 'berlangganan internet indihome fiber 50mbps',
    running_balance: 26950000,
    is_synthetic: 1,
    created_at: '2026-11-02T08:30:00Z',
  },
];

export const MOCK_MODELS = [
  {
    id: 'mod-lgb-v1',
    name: 'LightGBM-IndoCredit-Risk-Core',
    algorithm: 'LightGBM',
    version: '2.1.0',
    hyperparameters: JSON.stringify({ learning_rate: 0.05, num_leaves: 20, max_depth: 4 }),
    metrics: JSON.stringify({
      roc_auc: 0.9052,
      pr_auc: 0.864,
      f1_score: 0.835,
      brier_score: 0.0192,
      ks_statistic: 0.672,
    }),
    is_active: 1,
    is_synthetic: 1,
    created_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'mod-xgb-v1',
    name: 'XGBoost-GradientBoost-Benchmark',
    algorithm: 'XGBoost',
    version: '2.0.3',
    hyperparameters: JSON.stringify({ learning_rate: 0.05, max_depth: 4, n_estimators: 100 }),
    metrics: JSON.stringify({
      roc_auc: 0.8985,
      pr_auc: 0.851,
      f1_score: 0.822,
      brier_score: 0.0215,
      ks_statistic: 0.654,
    }),
    is_active: 0,
    is_synthetic: 1,
    created_at: '2026-11-01T10:30:00Z',
  },
  {
    id: 'mod-logreg-v1',
    name: 'LogisticRegression-Linear-Baseline',
    algorithm: 'Baseline_LogReg',
    version: '1.0.0',
    hyperparameters: JSON.stringify({ penalty: 'l2', C: 1.0, solver: 'lbfgs' }),
    metrics: JSON.stringify({
      roc_auc: 0.8421,
      pr_auc: 0.781,
      f1_score: 0.765,
      brier_score: 0.0385,
      ks_statistic: 0.548,
    }),
    is_active: 0,
    is_synthetic: 1,
    created_at: '2026-11-01T11:00:00Z',
  },
];

export const MOCK_SHAP_WORKSPACE = {
  assessment: {
    id: 'ass-mock-001',
    customer_id: 'cust-001',
    probability_of_default: 0.048,
    risk_category: 'LOW',
    recommendation: 'APPROVE_SUPPORTED',
    uncertainty_score: 0.021,
    data_completeness: 1.0,
    assessed_at: '2026-11-04T12:00:00Z',
  },
  explanation: {
    base_value: 0.125,
    final_pd: 0.048,
    feature_contributions: JSON.stringify([
      { feature: 'net_cash_flow', value: 11300000, contribution: -0.035, direction: 'DECREASES_RISK' },
      { feature: 'utility_regularity_score', value: 0.98, contribution: -0.028, direction: 'DECREASES_RISK' },
      { feature: 'avg_monthly_income', value: 18500000, contribution: -0.022, direction: 'DECREASES_RISK' },
      { feature: 'recurring_payment_consistency', value: 0.96, contribution: -0.015, direction: 'DECREASES_RISK' },
      { feature: 'expense_to_income_ratio', value: 0.389, contribution: -0.012, direction: 'DECREASES_RISK' },
      { feature: 'avg_balance', value: 24500000, contribution: -0.008, direction: 'DECREASES_RISK' },
      { feature: 'payment_burden_ratio', value: 0.135, contribution: 0.014, direction: 'INCREASES_RISK' },
      { feature: 'income_variability', value: 0.12, contribution: 0.009, direction: 'INCREASES_RISK' },
      { feature: 'cash_flow_volatility', value: 0.18, contribution: 0.008, direction: 'INCREASES_RISK' },
      { feature: 'monthly_expense', value: 7200000, contribution: 0.005, direction: 'INCREASES_RISK' },
      { feature: 'transaction_frequency', value: 18.5, contribution: -0.003, direction: 'DECREASES_RISK' },
      { feature: 'data_completeness_score', value: 1.0, contribution: -0.002, direction: 'DECREASES_RISK' },
    ]),
    global_importance_rank: JSON.stringify([
      { feature: 'utility_regularity_score', mean_abs_shap: 0.038 },
      { feature: 'net_cash_flow', mean_abs_shap: 0.035 },
      { feature: 'payment_burden_ratio', mean_abs_shap: 0.031 },
      { feature: 'expense_to_income_ratio', mean_abs_shap: 0.027 },
      { feature: 'recurring_payment_consistency', mean_abs_shap: 0.024 },
      { feature: 'avg_monthly_income', mean_abs_shap: 0.021 },
      { feature: 'income_variability', mean_abs_shap: 0.016 },
      { feature: 'avg_balance', mean_abs_shap: 0.014 },
    ]),
    disclaimer:
      'SHAP values indicate mathematical feature attribution for local additive risk scoring. They do not constitute deterministic credit rejection grounds under ISO/IEC 23984.',
  },
};

// Client-side rule-based NLP Classifier for portfolio demo
export function mockClassifyText(narrative: string) {
  const norm = narrative.toUpperCase();
  if (norm.includes('GAJI') || norm.includes('SALARY') || norm.includes('PAYROLL') || norm.includes('INCOME')) {
    return { category: 'Salary / Income', confidence: 0.982, is_low_confidence: false };
  }
  if (norm.includes('OMZET') || norm.includes('REVENUE') || norm.includes('PENJUALAN') || norm.includes('INVOICE')) {
    return { category: 'Business Revenue', confidence: 0.941, is_low_confidence: false };
  }
  if (norm.includes('PLN') || norm.includes('LISTRIK') || norm.includes('PDAM') || norm.includes('AIR') || norm.includes('PBB')) {
    return { category: 'Utility Payment', confidence: 0.965, is_low_confidence: false };
  }
  if (norm.includes('ANGSURAN') || norm.includes('CICILAN') || norm.includes('KPR') || norm.includes('LOAN') || norm.includes('REPAYMENT')) {
    return { category: 'Loan Repayment', confidence: 0.973, is_low_confidence: false };
  }
  if (norm.includes('ASURANSI') || norm.includes('INSURANCE') || norm.includes('BPJS') || norm.includes('PRUDENTIAL')) {
    return { category: 'Insurance', confidence: 0.952, is_low_confidence: false };
  }
  if (norm.includes('SEWA') || norm.includes('KONTRAKAN') || norm.includes('KOS') || norm.includes('HOUSING') || norm.includes('RENT')) {
    return { category: 'Housing', confidence: 0.925, is_low_confidence: false };
  }
  if (norm.includes('BELANJA') || norm.includes('SUPERMARKET') || norm.includes('INDOMARET') || norm.includes('ALFAMART') || norm.includes('GROCERIES')) {
    return { category: 'Groceries', confidence: 0.968, is_low_confidence: false };
  }
  if (norm.includes('GRAB') || norm.includes('GOJEK') || norm.includes('BENSIN') || norm.includes('PERTAMINA') || norm.includes('TRANSPORT')) {
    return { category: 'Transportation', confidence: 0.959, is_low_confidence: false };
  }
  if (norm.includes('NETFLIX') || norm.includes('SPOTIFY') || norm.includes('INDIHOME') || norm.includes('SUBSCRIPTION')) {
    return { category: 'Subscription', confidence: 0.947, is_low_confidence: false };
  }
  if (norm.includes('TRANSFER') || norm.includes('KIRIM') || norm.includes('TOPUP') || norm.includes('GOPAY') || norm.includes('OVO')) {
    return { category: 'Transfer', confidence: 0.912, is_low_confidence: false };
  }
  if (norm.includes('TARIK') || norm.includes('ATM') || norm.includes('WITHDRAWAL') || norm.includes('CASH')) {
    return { category: 'Cash Withdrawal', confidence: 0.938, is_low_confidence: false };
  }
  return { category: 'Unclassified', confidence: 0.421, is_low_confidence: true };
}

export const MOCK_QA_RUNS = [
  {
    id: '5bc9735a-5123-40d6-bef8-c6783931cb57',
    suite_mode: 'complete_system_audit',
    trigger_source: 'EMPIRICAL_AUDIT_VERIFICATION',
    status: 'COMPLETED',
    started_at: '2026-11-04T12:31:44Z',
    completed_at: '2026-11-04T12:32:12Z',
    duration_ms: 28439,
    total_tests: 47,
    passed_tests: 23,
    failed_tests: 23,
    not_implemented_count: 1,
    blocked_tests: 0,
    commit_sha: 'workspace-20261104',
    summary_json: JSON.stringify({ passed: 23, failed: 23, total: 47 }),
    is_synthetic: 1,
    created_at: '2026-11-04T12:32:12Z',
  },
];

export const MOCK_QA_SCHEDULES = [
  { id: 'startup_smoke', suite_mode: 'smoke_test', trigger_source: 'STARTUP', interval_seconds: 0, enabled: 1, last_run_at: '2026-11-04T12:31:44Z', next_run_at: null },
  { id: 'daily_audit', suite_mode: 'complete_system_audit', trigger_source: 'SCHEDULED', interval_seconds: 86400, enabled: 1, last_run_at: '2026-11-04T12:31:44Z', next_run_at: '2026-11-05T12:31:44Z' },
  { id: 'weekly_comprehensive', suite_mode: 'complete_system_audit', trigger_source: 'SCHEDULED', interval_seconds: 604800, enabled: 1, last_run_at: '2026-11-04T12:31:44Z', next_run_at: '2026-11-11T12:31:44Z' },
  { id: 'commit_regression_watch', suite_mode: 'complete_system_audit', trigger_source: 'GIT_COMMIT', interval_seconds: 0, enabled: 1, last_run_at: '2026-11-04T12:31:44Z', next_run_at: null },
];

export const MOCK_QA_FINDINGS = [
  {
    id: 'fnd-synth-005',
    run_id: '5bc9735a-5123-40d6-bef8-c6783931cb57',
    test_id: 'SYNTH-005',
    finding_code: 'FND-SYNTH-005',
    title: 'Multi-Cohort Generation Fails with HTTP 500 UNIQUE Constraint Violation on customer_code',
    affected_feature: 'Synthetic Data Laboratory — Multi-Cohort Persistence (POST /api/generator/generate)',
    module_id: 'M01',
    severity: 'CRITICAL',
    classification: 'CONFIRMED_DEFECT',
    expected_behavior: 'Multiple synthetic cohorts with different seeds must persist side-by-side with globally unique customer_code identifiers.',
    actual_behavior: 'HTTP 500 UNIQUE constraint failed: synthetic_customers.customer_code on second cohort.',
    root_cause_analysis: 'In engine.rs:371, customer_code format!("CUST-{:05}", i + 1) always starts at 0 for every dataset run without taking existing offset or seed into account.',
    impact: 'Prevents researchers from generating and comparing multiple synthetic cohorts without wiping the database.',
    recommended_correction: 'Include a deterministic prefix derived from dataset ID or seed in customer_code and account_number.',
    remediation_status: 'AWAITING_APPROVAL',
    proposed_patch_json: JSON.stringify({
      impacted_files: ['backend/src/generator/engine.rs'],
      minimal_patch_diff: '--- a/backend/src/generator/engine.rs\n+++ b/backend/src/generator/engine.rs\n@@ -371,1 +371,1 @@\n- customer_code: format!("CUST-{:05}", i + 1)\n+ customer_code: format!("CUST-{:02X}-{:05}", seed % 256, i + 1)',
      regression_risk: 'LOW — Maintains ChaCha8 PRNG draw order while guaranteeing globally unique customer codes.',
      rollback_instructions: 'Revert engine.rs lines 189 and 371.',
    }),
    created_at: '2026-11-04T12:32:12Z',
  },
  {
    id: 'fnd-mon-002',
    run_id: '5bc9735a-5123-40d6-bef8-c6783931cb57',
    test_id: 'MON-002',
    finding_code: 'FND-MON-002',
    title: 'Dynamic Monitoring INCOME_DROP and EXPENSE_SURGE Events Produce Zero PD Delta (0.0000)',
    affected_feature: 'Dynamic Risk Monitoring — Behavioral Stress Simulation (POST /api/monitoring/simulate)',
    module_id: 'M09',
    severity: 'CRITICAL',
    classification: 'CONFIRMED_DEFECT',
    expected_behavior: 'Simulating income drop or expense surge must alter cash flow features and increase recalculated PD (pd_delta > 0).',
    actual_behavior: 'Recalculated PD remains identical (new_pd == prior_pd, pd_delta == 0.0000).',
    root_cause_analysis: 'monitoring.rs mutates customer monthly_income/expenses, but calculator.rs computes features exclusively from bank_transactions when transactions exist.',
    impact: 'Renders 2 of 3 dynamic stress events non-functional, masking credit deterioration during shocks.',
    recommended_correction: 'Scale credit/debit transactions or insert shock transaction in bank_transactions before recalculating features.',
    remediation_status: 'AWAITING_APPROVAL',
    proposed_patch_json: JSON.stringify({
      impacted_files: ['backend/src/api/monitoring.rs'],
      minimal_patch_diff: '--- a/backend/src/api/monitoring.rs\n+++ b/backend/src/api/monitoring.rs\n@@ -100,2 +100,6 @@\n+ // Insert shock transaction to ensure FeatureCalculator detects cash flow disruption\n+ insert_shock_transaction(&tx, customer_id, shock_amount).await?;',
      regression_risk: 'LOW — Directly reflects simulated shocks into customer cash-flow features.',
      rollback_instructions: 'Revert monitoring.rs lines 88-116.',
    }),
    created_at: '2026-11-04T12:32:12Z',
  },
  {
    id: 'fnd-shap-003',
    run_id: '5bc9735a-5123-40d6-bef8-c6783931cb57',
    test_id: 'PY-SHAP-003',
    finding_code: 'FND-SHAP-003',
    title: 'XGBoost TreeExplainer Crashes on base_score String Format and Silently Returns All-Zero SHAP Values',
    affected_feature: 'Explainable AI Workspace — XGBoost Local SHAP Attribution (ml_service/app/xai/explainer.py)',
    module_id: 'M06',
    severity: 'HIGH',
    classification: 'CONFIRMED_DEFECT',
    expected_behavior: 'XGBoost models must produce valid, non-zero TreeSHAP feature attributions that satisfy local additive property.',
    actual_behavior: 'shap.TreeExplainer throws ValueError on [3.75E-2] and falls back to 12 zero SHAP contributions (0.0).',
    root_cause_analysis: 'XGBoost >= 2.0 serializes base_score as a string array; TreeExplainer float conversion fails in broad try-except block.',
    impact: 'Completely breaks local XAI explainability for the XGBoost model family.',
    recommended_correction: 'Use model.get_booster().predict(xgb.DMatrix(X), pred_contribs=True) natively.',
    remediation_status: 'AWAITING_APPROVAL',
    proposed_patch_json: JSON.stringify({
      impacted_files: ['ml_service/app/xai/explainer.py'],
      minimal_patch_diff: '--- a/ml_service/app/xai/explainer.py\n+++ b/ml_service/app/xai/explainer.py\n@@ -19,4 +19,8 @@\n+ if hasattr(model, "get_booster"):\n+     contribs = model.get_booster().predict(xgb.DMatrix(X), pred_contribs=True)[0]\n+     return contribs[:-1], float(contribs[-1])',
      regression_risk: 'LOW — Native C++ TreeSHAP implementation in XGBoost booster.',
      rollback_instructions: 'Revert explainer.py lines 19-25.',
    }),
    created_at: '2026-11-04T12:32:12Z',
  },
];

export const MOCK_QA_TEST_CASES = [
  { id: 'tc-1', test_id: 'SMOKE-001', module_id: 'M12', module_name: 'System Settings & Overview', title: 'Rust Backend Health & Overview Readiness Smoke Check', status: 'PASS', duration_ms: 15, logs: 'Verified Rust Axum router health & overview endpoints.' },
  { id: 'tc-2', test_id: 'SYNTH-001', module_id: 'M01', module_name: 'Synthetic Data Laboratory', title: 'ChaCha8 PRNG Determinism & Seed Sensitivity Verification', status: 'PASS', duration_ms: 128, logs: 'ChaCha8Rng determinism verified across 50 customers and 6M transaction series.' },
  { id: 'tc-3', test_id: 'SYNTH-002', module_id: 'M01', module_name: 'Synthetic Data Laboratory', title: 'Cohort Scaling (N=50, 150, 500), 8 Profiles & is_synthetic=1 Provenance Audit', status: 'PASS', duration_ms: 561, logs: 'All 3 cohort tiers, 8 behavioral profiles, and is_synthetic=1 provenance verified.' },
  { id: 'tc-4', test_id: 'SYNTH-003', module_id: 'M01', module_name: 'Synthetic Data Laboratory', title: 'Independent Ground-Truth Distress Rule Oracle Verification', status: 'PASS', duration_ms: 68, logs: 'Independent distress oracle matched 150/150 generated customer default labels.' },
  { id: 'tc-5', test_id: 'SYNTH-004', module_id: 'M01', module_name: 'Synthetic Data Laboratory', title: 'Target & Cohort Anti-Leakage Verification in Narratives and Feature Snapshots', status: 'PASS', duration_ms: 40, logs: 'Zero direct target or cohort leakage in transaction descriptions or feature_snapshots.' },
  { id: 'tc-6', test_id: 'SYNTH-005', module_id: 'M01', module_name: 'Synthetic Data Laboratory', title: 'Multi-Dataset Generation Persistence Without Unique Constraint Collision', status: 'FAIL', duration_ms: 29, logs: 'CONFIRMED CRITICAL DEFECT: engine.rs always formats customer_code as CUST-00001 causing UNIQUE constraint collision.' },
  { id: 'tc-7', test_id: 'FEAT-001', module_id: 'M03', module_name: 'Feature Engineering', title: '12-Feature Mathematical Oracle Verification Across 50 Customers', status: 'PASS', duration_ms: 81, logs: 'All 12 feature formulas verified against independent Rust oracle on normal customer series.' },
  { id: 'tc-8', test_id: 'FEAT-002', module_id: 'M03', module_name: 'Feature Engineering', title: 'Zero-Denominator Safety & Empty Utility Missing-Value Policy Audit', status: 'FAIL', duration_ms: 1, logs: 'CONFIRMED DEFECT: calculator.rs line 147 documents neutral_0.5, but lines 106-111 compute 0.0 when utilities is empty.' },
  { id: 'tc-9', test_id: 'FEAT-003', module_id: 'M03', module_name: 'Feature Engineering', title: 'Dedicated Feature Engineering UI Module Inventory Check', status: 'NOT_IMPLEMENTED', duration_ms: 1, logs: 'FEATURE INVENTORY GAP: Standalone Feature Engineering navigation item is omitted in Sidebar.tsx (embedded in Customer Explorer).' },
  { id: 'tc-10', test_id: 'API-001', module_id: 'M02', module_name: 'Synthetic Customer Explorer', title: 'Customer Explorer Filter & Pagination Total Count Consistency', status: 'FAIL', duration_ms: 5, logs: 'CONFIRMED DEFECT: customers.rs executes SELECT COUNT(*) without applying WHERE filter clauses.' },
  { id: 'tc-11', test_id: 'API-002', module_id: 'M02', module_name: 'Synthetic Customer Explorer', title: 'Customer 360 Detail Inspection, 404 Handling & On-Demand Feature Computation', status: 'PASS', duration_ms: 54, logs: 'Customer 360 detail and feature computation endpoints verified.' },
  { id: 'tc-12', test_id: 'API-003', module_id: 'M05', module_name: 'Model Research Laboratory', title: 'Rust POST /api/models/train Execution & Artifact Serialization Audit', status: 'FAIL', duration_ms: 80, logs: 'CONFIRMED DEFECT: models.rs returns hardcoded metrics (0.892) without calling Python ML microservice.' },
  { id: 'tc-13', test_id: 'RISK-001', module_id: 'M07', module_name: 'Credit Risk Decision Support', title: 'PD Threshold Boundary Mapping (12%, 35%, 65%) & Live Customer Evaluation', status: 'PASS', duration_ms: 100, logs: 'PD boundary mapping and live customer evaluation verified.' },
  { id: 'tc-14', test_id: 'MON-002', module_id: 'M09', module_name: 'Dynamic Risk Monitoring', title: 'INCOME_DROP & EXPENSE_SURGE Feature Recalculation and PD Delta Verification', status: 'FAIL', duration_ms: 219, logs: 'CONFIRMED CRITICAL DEFECT: calculator.rs computes features from bank_transactions, resulting in pd_delta == 0.0.' },
  { id: 'tc-15', test_id: 'PY-SHAP-001', module_id: 'M08', module_name: 'Explainable AI Workspace', title: 'LightGBM TreeSHAP Additive Identity Verification (Log-Odds Margin Space)', status: 'PASS', duration_ms: 17, logs: 'TreeSHAP additive identity holds in log-odds space: sigmoid(base_value + sum_shap) = predicted_pd.' },
  { id: 'tc-16', test_id: 'PY-PSI-001', module_id: 'M10', module_name: 'Dynamic Risk Monitoring', title: '10-Bucket PSI Calculation & Threshold Classification Oracle', status: 'PASS', duration_ms: 15, logs: 'Identical=0.0, Small=0.0319, Moderate=0.1886, Significant=1.4287 verified.' },
  { id: 'tc-17', test_id: 'UI-E2E-001', module_id: 'M12', module_name: 'System Settings & Overview', title: 'SPA Shell, Research Overview KPI Cards & Backend Telemetry Rendering', status: 'PASS', duration_ms: 1931, logs: 'Research Overview rendered with live portfolio metrics and zero uncaught exceptions in headless Chromium.' },
  { id: 'tc-18', test_id: 'UI-E2E-006', module_id: 'M08', module_name: 'Explainable AI Workspace', title: 'Explainable AI (XAI) Workspace Local SHAP Waterfall & Global Importance View', status: 'PASS', duration_ms: 657, logs: 'XAI Workspace rendered local and global SHAP visualizations in headless Chromium.' },
  { id: 'tc-19', test_id: 'UI-E2E-009', module_id: 'M12', module_name: 'Autonomous QA & Empirical Audit Center', title: 'Autonomous QA & Audit Dashboard UI, 12-Module Matrix, Remediation Modal & Responsive Viewport', status: 'PASS', duration_ms: 2821, logs: 'QA & Audit Dashboard verified with 0 console errors across desktop and mobile viewports.' },
];
