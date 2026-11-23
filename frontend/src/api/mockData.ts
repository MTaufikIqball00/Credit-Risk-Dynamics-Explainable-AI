// Rich Realistic Mock Data for Interactive Portfolio Showcase Mode
// Strictly aligned with Rust Axum & Python FastAPI contracts across all 14 platform modules.

export const OFFICIAL_PROFILES = [
  'Stable Income',
  'Variable Income',
  'Irregular Income',
  'High Expense Burden',
  'Consistent Payment',
  'Irregular Payment',
  'Thin-file Customer',
  'No Credit History',
] as const;

export const FULL_DATA_DICTIONARY = {
  target: 'is_defaulted (0: Non-default, 1: Default in synthetic simulation)',
  default_definition:
    'Simulated financial distress: obligations > 85% income with severe cash depletion (< 25% monthly income), or 90+ DPD / >= 2 missed utility cycles',
  leakage_safeguard:
    'Default outcome is determined after 6-month time-series simulation from downstream cash depletion, never present in raw transaction streams or feature snapshots',
  features: [
    'avg_monthly_income (IDR)',
    'income_variability (standard deviation / mean)',
    'monthly_expense (IDR)',
    'net_cash_flow (IDR)',
    'avg_balance (IDR)',
    'cash_flow_volatility (coefficient of variation)',
    'expense_to_income_ratio (expense / income)',
    'recurring_payment_consistency (ratio 0.0 - 1.0)',
    'utility_regularity_score (ratio 0.0 - 1.0)',
    'payment_burden_ratio (obligations / income)',
    'transaction_frequency (tx per month)',
    'data_completeness_score (0.0 - 1.0)',
  ],
  cohorts: [
    'Group_A (Audit cohort 1)',
    'Group_B (Audit cohort 2)',
    'Group_C (Audit cohort 3)',
  ],
  disclaimer:
    'SYNTHETIC RESEARCH DATA ONLY - NOT DERIVED FROM REAL PERSONS OR FINANCIAL INSTITUTIONS',
};

export const MOCK_DATASETS = [
  {
    id: 'ds-seed-2026-alpha',
    name: 'Research-Baseline-Dataset-v1',
    version: '1.0.0',
    description:
      'Controlled research cohort with 50 synthetic customers across all 8 official behavioral profiles.',
    profile_type: 'small',
    customer_count: 50,
    random_seed: 42,
    generator_version: 'v1.2.0-research',
    data_dictionary: JSON.stringify(FULL_DATA_DICTIONARY),
    is_synthetic: 1,
    created_at: '2026-11-02T08:00:00Z',
  },
  {
    id: 'ds-seed-2026-beta',
    name: 'Stress-Testing-Cohort-Beta',
    version: '1.1.0',
    description:
      'Expanded cohort of 150 synthetic customers used for dynamic shock injection and PSI drift surveillance.',
    profile_type: 'medium',
    customer_count: 150,
    random_seed: 101,
    generator_version: 'v1.2.0-research',
    data_dictionary: JSON.stringify(FULL_DATA_DICTIONARY),
    is_synthetic: 1,
    created_at: '2026-11-03T10:30:00Z',
  },
];

export const MOCK_CUSTOMERS = [
  {
    id: 'cust-001',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-A1F2-00001',
    simulation_profile: 'Stable Income',
    employment_type: 'Permanent Corporate Employee',
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
    customer_code: 'CUST-A1F2-00002',
    simulation_profile: 'Variable Income',
    employment_type: 'Freelance / Commission Based',
    monthly_income: 14200000,
    stated_monthly_expenses: 7800000,
    credit_obligation_amount: 2400000,
    existing_credit_lines: 2,
    credit_history_months: 24,
    synthetic_cohort: 'Group_B',
    is_defaulted: 0,
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-003',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-A1F2-00003',
    simulation_profile: 'Irregular Income',
    employment_type: 'Seasonal Contract Worker',
    monthly_income: 9800000,
    stated_monthly_expenses: 6900000,
    credit_obligation_amount: 2200000,
    existing_credit_lines: 1,
    credit_history_months: 18,
    synthetic_cohort: 'Group_C',
    is_defaulted: 0,
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-004',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-A1F2-00004',
    simulation_profile: 'High Expense Burden',
    employment_type: 'Private Sector Staff',
    monthly_income: 12000000,
    stated_monthly_expenses: 10200000,
    credit_obligation_amount: 4600000,
    existing_credit_lines: 4,
    credit_history_months: 36,
    synthetic_cohort: 'Group_A',
    is_defaulted: 1,
    default_reason:
      'Synthetic distress criteria met: DTI > 85% with cash buffer exhaustion and/or chronic delinquencies',
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-005',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-A1F2-00005',
    simulation_profile: 'Consistent Payment',
    employment_type: 'Civil Servant / State Enterprise',
    monthly_income: 22000000,
    stated_monthly_expenses: 8100000,
    credit_obligation_amount: 3100000,
    existing_credit_lines: 2,
    credit_history_months: 64,
    synthetic_cohort: 'Group_B',
    is_defaulted: 0,
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-006',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-A1F2-00006',
    simulation_profile: 'Irregular Payment',
    employment_type: 'Informal / Small Merchant',
    monthly_income: 11500000,
    stated_monthly_expenses: 8900000,
    credit_obligation_amount: 3800000,
    existing_credit_lines: 3,
    credit_history_months: 22,
    synthetic_cohort: 'Group_C',
    is_defaulted: 1,
    default_reason: 'Utility DPD reached 92 days with 2 missed billing cycles',
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-007',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-A1F2-00007',
    simulation_profile: 'Thin-file Customer',
    employment_type: 'Entry-Level Professional',
    monthly_income: 8200000,
    stated_monthly_expenses: 4500000,
    credit_obligation_amount: 600000,
    existing_credit_lines: 1,
    credit_history_months: 4,
    synthetic_cohort: 'Group_A',
    is_defaulted: 0,
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'cust-008',
    dataset_id: 'ds-seed-2026-alpha',
    customer_code: 'CUST-A1F2-00008',
    simulation_profile: 'No Credit History',
    employment_type: 'Recent Graduate / First Account',
    monthly_income: 6800000,
    stated_monthly_expenses: 3900000,
    credit_obligation_amount: 0,
    existing_credit_lines: 0,
    credit_history_months: 0,
    synthetic_cohort: 'Group_B',
    is_defaulted: 0,
    is_synthetic: 1,
    created_at: '2026-05-01T08:00:00Z',
  },
];

export const FEATURE_CATALOG_DEFINITIONS = {
  avg_monthly_income: {
    unit: 'IDR',
    window: '6M',
    formula: 'sum(CREDIT) / 6',
    missing_policy: 'fallback_stated_income',
    category: 'Income Stability',
    description: 'Mean monthly cash inflow derived from 6-month credit transaction records.',
  },
  income_variability: {
    unit: 'ratio',
    window: '6M',
    formula: 'std(income) / mean(income)',
    missing_policy: 'impute_0.15',
    category: 'Income Stability',
    description: 'Coefficient of variation of credit inflows measuring payroll vs irregular gig earnings.',
  },
  monthly_expense: {
    unit: 'IDR',
    window: '6M',
    formula: 'sum(DEBIT) / 6',
    missing_policy: 'fallback_stated_expenses',
    category: 'Expenditure',
    description: 'Mean monthly cash outflow summed across all debit bank transactions.',
  },
  net_cash_flow: {
    unit: 'IDR',
    window: '6M',
    formula: 'avg_income - monthly_expense',
    missing_policy: 'computed',
    category: 'Liquidity',
    description: 'Monthly disposable surplus or deficit available to service financial obligations.',
  },
  avg_balance: {
    unit: 'IDR',
    window: '6M',
    formula: 'mean(running_balance)',
    missing_policy: 'fallback_half_income',
    category: 'Liquidity',
    description: 'Average end-of-transaction checking/savings buffer across the 6-month window.',
  },
  cash_flow_volatility: {
    unit: 'ratio',
    window: '6M',
    formula: 'std(net_flows) / avg_income',
    missing_policy: 'impute_0.20',
    category: 'Liquidity',
    description: 'Dispersion of signed transaction amounts normalized by average monthly income.',
  },
  expense_to_income_ratio: {
    unit: 'ratio',
    window: '6M',
    formula: 'monthly_expense / avg_income',
    missing_policy: 'ratio_bound_2.5',
    category: 'Burden',
    description: 'Proportion of monthly income consumed by living expenses (bounded at 2.5).',
  },
  recurring_payment_consistency: {
    unit: 'ratio',
    window: '6M',
    formula: 'paid_cycles / total_cycles',
    missing_policy: 'impute_1.0_if_no_obligations',
    category: 'Repayment Discipline',
    description: 'Consistency of recurring loan installment debits detected over 6 cycles.',
  },
  utility_regularity_score: {
    unit: 'score 0-1',
    window: '6M',
    formula: 'on_time_utilities / total_utilities',
    missing_policy: 'neutral_0.5',
    category: 'Repayment Discipline',
    description: 'Ratio of on-time PLN/PDAM utility settlements; defaults to neutral 0.5 when absent.',
  },
  payment_burden_ratio: {
    unit: 'ratio',
    window: '6M',
    formula: 'obligation / avg_income',
    missing_policy: 'direct_calc',
    category: 'Burden',
    description: 'Debt-to-income (DTI) ratio measuring contractual credit service load.',
  },
  transaction_frequency: {
    unit: 'count/month',
    window: '6M',
    formula: 'count(tx) / 6',
    missing_policy: 'zero_count',
    category: 'Activity',
    description: 'Average monthly account transaction velocity across credits and debits.',
  },
  data_completeness_score: {
    unit: 'score 0-1',
    window: '6M',
    formula: 'valid_signals / 12',
    missing_policy: 'strictly_measured',
    category: 'Data Quality',
    description: 'Observed signal density distinguishing full-file vs thin-file synthetic records.',
  },
};

export function buildCustomerFeatureSnapshot(customer: (typeof MOCK_CUSTOMERS)[number]) {
  const inc = customer.monthly_income;
  const exp = customer.stated_monthly_expenses;
  const ob = customer.credit_obligation_amount;
  const net = inc - exp;
  const eti = Number(Math.min(exp / Math.max(inc, 1), 2.5).toFixed(4));
  const pbr = Number(Math.min(ob / Math.max(inc, 1), 2.0).toFixed(4));
  const isRisky =
    customer.simulation_profile === 'High Expense Burden' ||
    customer.simulation_profile === 'Irregular Payment';
  const isVolatile =
    customer.simulation_profile === 'Variable Income' ||
    customer.simulation_profile === 'Irregular Income';
  const isThin =
    customer.simulation_profile === 'Thin-file Customer' ||
    customer.simulation_profile === 'No Credit History';

  return {
    id: `feat-${customer.id}`,
    customer_id: customer.id,
    snapshot_date: '2026-11-04T09:00:00Z',
    feature_version: 'v2.1.0-clean',
    avg_monthly_income: inc,
    income_variability: isVolatile ? 0.34 : isRisky ? 0.22 : 0.08,
    monthly_expense: exp,
    net_cash_flow: net,
    avg_balance: isRisky ? Math.round(inc * 0.28) : Math.round(inc * 1.45),
    cash_flow_volatility: isVolatile ? 0.48 : isRisky ? 0.39 : 0.16,
    expense_to_income_ratio: eti,
    recurring_payment_consistency: ob === 0 ? 1.0 : isRisky ? 0.67 : 0.96,
    utility_regularity_score: isRisky ? 0.5 : isThin ? 0.83 : 1.0,
    payment_burden_ratio: pbr,
    transaction_frequency: isThin ? 5.5 : 14.5,
    data_completeness_score: isThin ? 0.8333 : 1.0,
    features_json: JSON.stringify({ definitions: FEATURE_CATALOG_DEFINITIONS }),
    is_synthetic: 1,
    created_at: '2026-11-04T09:00:00Z',
  };
}

export const MOCK_FEATURE_SNAPSHOTS = MOCK_CUSTOMERS.map(buildCustomerFeatureSnapshot);
export const MOCK_FEATURES = MOCK_FEATURE_SNAPSHOTS[0];

export const MOCK_TRANSACTIONS = [
  {
    id: 'tx-001',
    account_id: 'acc-001',
    customer_id: 'cust-001',
    transaction_date: '2026-10-25T09:15:00Z',
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
    transaction_date: '2026-10-26T14:22:00Z',
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
    transaction_date: '2026-10-28T11:05:00Z',
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
    transaction_date: '2026-10-30T19:40:00Z',
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
    transaction_date: '2026-11-02T08:30:00Z',
    amount: 350000,
    direction: 'DEBIT',
    raw_description: 'BERLANGGANAN INTERNET INDIHOME FIBER 50MBPS',
    cleaned_description: 'berlangganan internet indihome fiber 50mbps',
    running_balance: 26950000,
    is_synthetic: 1,
    created_at: '2026-11-02T08:30:00Z',
  },
];

export const MOCK_NLP_MODELS = [
  {
    id: 'transformer-indo-finbert',
    name: 'Indo-FinBERT Transformer',
    architecture:
      'HuggingFace Transformers (indobert-base-uncased fine-tuned on Indonesian Banking Text)',
    status: 'ACTIVE_PRODUCTION_RESEARCH',
    categories_count: 11,
    supported_languages: ['id', 'en'],
    f1_macro: 0.946,
    accuracy: 0.954,
    latency_ms: 12.4,
  },
  {
    id: 'baseline-tfidf-logistic',
    name: 'Hybrid Word+Char TF-IDF + Logistic Regression',
    architecture:
      'Scikit-Learn FeatureUnion (Word 1-2 + Char_WB 3-5 N-grams) + L2 Logistic Classifier',
    status: 'BENCHMARK_BASELINE',
    categories_count: 11,
    supported_languages: ['id', 'en'],
    f1_macro: 0.958,
    accuracy: 0.964,
    latency_ms: 1.4,
  },
];

export const MOCK_NLP_EVALUATION = {
  pipeline_version: 'NLP-IndoFin-v2.1',
  evaluation_dataset:
    'Strictly Disjoint Held-Out Bilingual ID/EN Banking Corpus (N=55, 0% Train Overlap)',
  metrics: {
    macro_precision: 0.964,
    macro_recall: 0.958,
    macro_f1: 0.961,
    overall_accuracy: 0.964,
    unclassified_rate: 0.018,
  },
  per_class_performance: [
    { category: 'Salary / Income', precision: 1.0, recall: 1.0, f1: 1.0, support: 5 },
    { category: 'Business Revenue', precision: 1.0, recall: 1.0, f1: 1.0, support: 5 },
    { category: 'Utility Payment', precision: 0.96, recall: 0.95, f1: 0.955, support: 5 },
    { category: 'Loan Repayment', precision: 0.95, recall: 0.96, f1: 0.955, support: 5 },
    { category: 'Insurance', precision: 0.96, recall: 0.94, f1: 0.95, support: 5 },
    { category: 'Housing', precision: 0.94, recall: 0.95, f1: 0.945, support: 5 },
    { category: 'Groceries', precision: 0.96, recall: 0.98, f1: 0.97, support: 5 },
    { category: 'Transportation', precision: 1.0, recall: 0.96, f1: 0.98, support: 5 },
    { category: 'Subscription', precision: 0.96, recall: 0.94, f1: 0.95, support: 5 },
    { category: 'Transfer', precision: 0.92, recall: 0.92, f1: 0.92, support: 5 },
    { category: 'Cash Withdrawal', precision: 1.0, recall: 0.98, f1: 0.99, support: 5 },
  ],
  classes: [
    'Salary / Income',
    'Business Revenue',
    'Utility Payment',
    'Loan Repayment',
    'Insurance',
    'Housing',
    'Groceries',
    'Transportation',
    'Subscription',
    'Transfer',
    'Cash Withdrawal',
  ],
  disclaimer:
    'Academic validation on disjoint synthetic financial tokens. Domain-shift testing required prior to any non-synthetic usage.',
};

export const MOCK_MODEL_COMPARISON = [
  {
    model_name: 'LightGBM-Research-v2.0',
    algorithm: 'LightGBM',
    roc_auc: 0.914,
    pr_auc: 0.872,
    f1_score: 0.842,
    precision: 0.858,
    recall: 0.827,
    brier_score: 0.089,
    log_loss: 0.284,
    inference_latency_ms: 3.4,
    shap_compatibility: 'TreeExplainer (Exact Fast)',
    status: 'CHAMPION',
    roc_curve: [
      { fpr: 0.0, tpr: 0.0 },
      { fpr: 0.04, tpr: 0.56 },
      { fpr: 0.11, tpr: 0.78 },
      { fpr: 0.21, tpr: 0.89 },
      { fpr: 0.38, tpr: 0.95 },
      { fpr: 0.65, tpr: 0.99 },
      { fpr: 1.0, tpr: 1.0 },
    ],
    calibration_curve: [
      { pred_prob: 0.08, actual_rate: 0.07 },
      { pred_prob: 0.26, actual_rate: 0.27 },
      { pred_prob: 0.48, actual_rate: 0.5 },
      { pred_prob: 0.69, actual_rate: 0.67 },
      { pred_prob: 0.89, actual_rate: 0.91 },
    ],
  },
  {
    model_name: 'XGBoost-Research-v2.0',
    algorithm: 'XGBoost',
    roc_auc: 0.903,
    pr_auc: 0.858,
    f1_score: 0.828,
    precision: 0.841,
    recall: 0.816,
    brier_score: 0.096,
    log_loss: 0.299,
    inference_latency_ms: 4.1,
    shap_compatibility: 'Native C++ pred_contribs (Exact)',
    status: 'CHALLENGER',
    roc_curve: [
      { fpr: 0.0, tpr: 0.0 },
      { fpr: 0.05, tpr: 0.52 },
      { fpr: 0.13, tpr: 0.75 },
      { fpr: 0.24, tpr: 0.87 },
      { fpr: 0.42, tpr: 0.94 },
      { fpr: 0.68, tpr: 0.98 },
      { fpr: 1.0, tpr: 1.0 },
    ],
    calibration_curve: [
      { pred_prob: 0.09, actual_rate: 0.08 },
      { pred_prob: 0.28, actual_rate: 0.25 },
      { pred_prob: 0.5, actual_rate: 0.53 },
      { pred_prob: 0.71, actual_rate: 0.68 },
      { pred_prob: 0.88, actual_rate: 0.9 },
    ],
  },
  {
    model_name: 'Baseline-LogReg-v1.0',
    algorithm: 'Baseline_LogReg',
    roc_auc: 0.848,
    pr_auc: 0.785,
    f1_score: 0.768,
    precision: 0.782,
    recall: 0.755,
    brier_score: 0.128,
    log_loss: 0.378,
    inference_latency_ms: 0.7,
    shap_compatibility: 'LinearExplainer (Exact)',
    status: 'BENCHMARK_BASELINE',
    roc_curve: [
      { fpr: 0.0, tpr: 0.0 },
      { fpr: 0.08, tpr: 0.42 },
      { fpr: 0.18, tpr: 0.67 },
      { fpr: 0.32, tpr: 0.81 },
      { fpr: 0.52, tpr: 0.91 },
      { fpr: 0.76, tpr: 0.97 },
      { fpr: 1.0, tpr: 1.0 },
    ],
    calibration_curve: [
      { pred_prob: 0.1, actual_rate: 0.12 },
      { pred_prob: 0.3, actual_rate: 0.26 },
      { pred_prob: 0.51, actual_rate: 0.46 },
      { pred_prob: 0.72, actual_rate: 0.66 },
      { pred_prob: 0.87, actual_rate: 0.83 },
    ],
  },
];

export const MOCK_MODELS = MOCK_MODEL_COMPARISON;

export const MOCK_SHAP_WORKSPACE = {
  assessment_id: 'ass-mock-001',
  customer_id: 'cust-001',
  model_version: 'LightGBM-Research-v2.0',
  probability_of_default: 0.048,
  risk_category: 'LOW',
  recommendation: 'APPROVE_SUPPORTED',
  base_value: 0.18,
  waterfall_contributions: [
    { feature: 'utility_regularity_score', value: 1.0, contribution: -0.052, direction: 'DECREASES_RISK' },
    { feature: 'net_cash_flow', value: 11300000, contribution: -0.038, direction: 'DECREASES_RISK' },
    { feature: 'expense_to_income_ratio', value: 0.3892, contribution: -0.029, direction: 'DECREASES_RISK' },
    { feature: 'recurring_payment_consistency', value: 0.96, contribution: -0.019, direction: 'DECREASES_RISK' },
    { feature: 'avg_balance', value: 26825000, contribution: -0.014, direction: 'DECREASES_RISK' },
    { feature: 'payment_burden_ratio', value: 0.1351, contribution: 0.012, direction: 'INCREASES_RISK' },
    { feature: 'income_variability', value: 0.08, contribution: -0.008, direction: 'DECREASES_RISK' },
    { feature: 'cash_flow_volatility', value: 0.16, contribution: 0.009, direction: 'INCREASES_RISK' },
    { feature: 'avg_monthly_income', value: 18500000, contribution: -0.006, direction: 'DECREASES_RISK' },
    { feature: 'monthly_expense', value: 7200000, contribution: 0.007, direction: 'INCREASES_RISK' },
    { feature: 'transaction_frequency', value: 14.5, contribution: 0.004, direction: 'INCREASES_RISK' },
    { feature: 'data_completeness_score', value: 1.0, contribution: 0.002, direction: 'INCREASES_RISK' },
  ],
  global_importance_rank: [
    ['utility_regularity_score', 0.285],
    ['payment_burden_ratio', 0.242],
    ['expense_to_income_ratio', 0.194],
    ['net_cash_flow', 0.138],
    ['recurring_payment_consistency', 0.084],
    ['income_variability', 0.057],
  ],
  feature_snapshot: MOCK_FEATURES,
  explanation_guidance: {
    disclaimer:
      'SHAP indicates mathematical feature attribution toward model output score, not causal impact or deterministic lending decisions.',
    interpretation:
      'Positive contributions elevate estimated Probability of Default (PD), while negative contributions diminish estimated risk.',
    policy: 'No adverse action reason may be communicated without explicit secondary policy validation.',
  },
};

// Client-side rule-based NLP Classifier for portfolio showcase (unified < 0.65 low-confidence threshold)
export function mockClassifyText(narrative: string) {
  const norm = narrative.toUpperCase().trim();
  if (!norm) {
    return {
      category: 'Unclassified',
      confidence: 0.0,
      is_low_confidence: true,
      model_name: 'TF-IDF-Logistic-IndoFin-v2.1',
    };
  }
  const makeRes = (category: string, confidence: number) => ({
    category,
    confidence,
    is_low_confidence: confidence < 0.65,
    model_name: 'TF-IDF-Logistic-IndoFin-v2.1',
  });

  if (norm.includes('GAJI') || norm.includes('SALARY') || norm.includes('PAYROLL') || norm.includes('WAGES')) {
    return makeRes('Salary / Income', 0.962);
  }
  if (norm.includes('QRIS') || norm.includes('OMZET') || norm.includes('REVENUE') || norm.includes('PENJUALAN') || norm.includes('INVOICE') || norm.includes('SETTLEMENT')) {
    return makeRes('Business Revenue', 0.941);
  }
  if (norm.includes('PLN') || norm.includes('LISTRIK') || norm.includes('PDAM') || norm.includes('AIR') || norm.includes('INDIHOME') || norm.includes('TELKOM')) {
    return makeRes('Utility Payment', 0.965);
  }
  if (norm.includes('ANGSURAN') || norm.includes('CICILAN') || norm.includes('KPR') || norm.includes('LOAN') || norm.includes('REPAYMENT') || norm.includes('LEASING')) {
    return makeRes('Loan Repayment', 0.973);
  }
  if (norm.includes('ASURANSI') || norm.includes('INSURANCE') || norm.includes('BPJS') || norm.includes('PRUDENTIAL') || norm.includes('ALLIANZ')) {
    return makeRes('Insurance', 0.952);
  }
  if (norm.includes('SEWA') || norm.includes('KONTRAKAN') || norm.includes('APARTEMEN') || norm.includes('IPL') || norm.includes('HOUSING') || norm.includes('RENT')) {
    return makeRes('Housing', 0.925);
  }
  if (norm.includes('BELANJA') || norm.includes('SUPERINDO') || norm.includes('SUPERMARKET') || norm.includes('INDOMARET') || norm.includes('ALFAMART') || norm.includes('GROCERIES')) {
    return makeRes('Groceries', 0.968);
  }
  if (norm.includes('GRAB') || norm.includes('GOJEK') || norm.includes('BENSIN') || norm.includes('BBM') || norm.includes('PERTAMINA') || norm.includes('TRANSPORT')) {
    return makeRes('Transportation', 0.959);
  }
  if (norm.includes('NETFLIX') || norm.includes('SPOTIFY') || norm.includes('YOUTUBE') || norm.includes('SUBSCRIPTION')) {
    return makeRes('Subscription', 0.947);
  }
  if (norm.includes('TRANSFER') || norm.includes('TRSF') || norm.includes('BI-FAST') || norm.includes('KIRIM')) {
    return makeRes('Transfer', 0.892);
  }
  if (norm.includes('TARIK') || norm.includes('ATM') || norm.includes('WITHDRAWAL') || norm.includes('CASH')) {
    return makeRes('Cash Withdrawal', 0.938);
  }
  return makeRes('Unclassified', 0.382);
}

export const QA_EXECUTION_MODES = [
  'complete_system_audit',
  'smoke_test',
  'frontend_functional',
  'rust_api_test',
  'database_integrity',
  'synthetic_data_validation',
  'feature_engineering_validation',
  'nlp_classification_test',
  'ml_training_evaluation_test',
  'model_comparison_test',
  'credit_risk_assessment_test',
  'shap_xai_validation',
  'dynamic_risk_monitoring_test',
  'psi_drift_validation',
  'fairness_audit',
  'experiment_reproducibility_test',
  'audit_trail_integrity_test',
  'security_test',
  'performance_test',
];

export const MOCK_QA_MODULE_COVERAGE = [
  { module_id: 'M01', module_name: 'Synthetic Data Laboratory', implemented_status: 'IMPLEMENTED', automated_tests_count: 5, passed_count: 5, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
  { module_id: 'M02', module_name: 'Synthetic Customer Explorer', implemented_status: 'IMPLEMENTED', automated_tests_count: 4, passed_count: 4, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
  { module_id: 'M03', module_name: 'Feature Engineering', implemented_status: 'IMPLEMENTED', automated_tests_count: 3, passed_count: 3, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
  { module_id: 'M04', module_name: 'Transaction NLP Intelligence', implemented_status: 'IMPLEMENTED', automated_tests_count: 4, passed_count: 4, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
  { module_id: 'M05', module_name: 'Model Research Laboratory', implemented_status: 'IMPLEMENTED', automated_tests_count: 5, passed_count: 5, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
  { module_id: 'M06', module_name: 'Model Benchmark Comparison', implemented_status: 'IMPLEMENTED', automated_tests_count: 2, passed_count: 2, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
  { module_id: 'M07', module_name: 'Credit Risk Decision Support', implemented_status: 'IMPLEMENTED', automated_tests_count: 3, passed_count: 3, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
  { module_id: 'M08', module_name: 'Explainable AI (SHAP)', implemented_status: 'IMPLEMENTED', automated_tests_count: 4, passed_count: 4, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
  { module_id: 'M09', module_name: 'Dynamic Risk Monitoring', implemented_status: 'IMPLEMENTED', automated_tests_count: 4, passed_count: 4, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
  { module_id: 'M10', module_name: 'PSI Data Drift Surveillance', implemented_status: 'IMPLEMENTED', automated_tests_count: 2, passed_count: 2, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
  { module_id: 'M11', module_name: 'Fairness & Audit Governance', implemented_status: 'IMPLEMENTED', automated_tests_count: 3, passed_count: 3, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
  { module_id: 'M12', module_name: 'System, Security & QA Ops', implemented_status: 'IMPLEMENTED', automated_tests_count: 8, passed_count: 8, failed_count: 0, not_implemented_count: 0, pass_rate_pct: 100.0, status: 'VERIFIED' },
];

export const MOCK_QA_RUNS = [
  {
    id: 'post-fix-20261123-verified',
    suite_mode: 'complete_system_audit',
    trigger_source: 'POST_REMEDIATION_VERIFICATION',
    status: 'COMPLETED',
    started_at: '2026-11-23T05:00:00Z',
    completed_at: '2026-11-23T05:00:24Z',
    duration_ms: 24120,
    total_tests: 47,
    passed_tests: 47,
    failed_tests: 0,
    not_implemented_count: 0,
    blocked_tests: 0,
    commit_sha: 'remediated-v2.1',
    summary_json: JSON.stringify({ passed: 47, failed: 0, total: 47 }),
    is_synthetic: 1,
    created_at: '2026-11-23T05:00:24Z',
  },
  {
    id: '5bc9735a-5123-40d6-bef8-c6783931cb57',
    suite_mode: 'complete_system_audit',
    trigger_source: 'BASELINE_EMPIRICAL_AUDIT',
    status: 'COMPLETED',
    started_at: '2026-11-04T12:31:44Z',
    completed_at: '2026-11-04T12:32:12Z',
    duration_ms: 28439,
    total_tests: 47,
    passed_tests: 23,
    failed_tests: 23,
    not_implemented_count: 1,
    blocked_tests: 0,
    commit_sha: 'baseline-v1.0',
    summary_json: JSON.stringify({ passed: 23, failed: 23, total: 47 }),
    is_synthetic: 1,
    created_at: '2026-11-04T12:32:12Z',
  },
];

export const MOCK_QA_SCHEDULES = [
  {
    id: 'startup_smoke',
    name: 'Startup Smoke Readiness',
    schedule_type: 'ON_BOOT',
    suite_mode: 'smoke_test',
    cron_expression: '@boot',
    interval_seconds: 0,
    enabled: 1,
    last_run_at: '2026-11-23T05:00:00Z',
    next_run_at: 'On Server Boot',
    last_commit_sha: 'remediated-v2.1',
  },
  {
    id: 'daily_audit',
    name: 'Daily Full System Audit',
    schedule_type: 'INTERVAL',
    suite_mode: 'complete_system_audit',
    cron_expression: '0 2 * * *',
    interval_seconds: 86400,
    enabled: 1,
    last_run_at: '2026-11-23T05:00:00Z',
    next_run_at: '2026-11-24T05:00:00Z',
    last_commit_sha: 'remediated-v2.1',
  },
  {
    id: 'weekly_comprehensive',
    name: 'Weekly Deep Regression Suite',
    schedule_type: 'INTERVAL',
    suite_mode: 'complete_system_audit',
    cron_expression: '0 3 * * 0',
    interval_seconds: 604800,
    enabled: 1,
    last_run_at: '2026-11-23T05:00:00Z',
    next_run_at: '2026-11-30T05:00:00Z',
    last_commit_sha: 'remediated-v2.1',
  },
  {
    id: 'commit_regression_watch',
    name: 'Git Commit Regression Watcher',
    schedule_type: 'GIT_WATCH',
    suite_mode: 'complete_system_audit',
    cron_expression: '@commit',
    interval_seconds: 0,
    enabled: 1,
    last_run_at: '2026-11-23T05:00:00Z',
    next_run_at: 'On Commit Change',
    last_commit_sha: 'remediated-v2.1',
  },
];

export const MOCK_QA_FINDINGS = [
  {
    id: 'fnd-synth-005',
    run_id: '5bc9735a-5123-40d6-bef8-c6783931cb57',
    test_id: 'SYNTH-005',
    finding_code: 'FND-SYNTH-005',
    title: 'Multi-Cohort Generation UNIQUE Constraint Collision on customer_code (Resolved in v2.1)',
    affected_feature: 'Synthetic Data Laboratory — Multi-Cohort Persistence',
    module_id: 'M01',
    severity: 'CRITICAL',
    classification: 'CONFIRMED_DEFECT',
    confidence_level: 'HIGH',
    expected_behavior:
      'Multiple synthetic cohorts with different seeds must persist side-by-side with globally unique customer_code and account_number identifiers.',
    actual_behavior:
      'Resolved: Deterministic dataset-scoped prefixing (`CUST-{PREFIX}-{INDEX}`) eliminates collisions while preserving ChaCha8 determinism.',
    root_cause_analysis:
      'Previously engine.rs formatted customer_code starting at CUST-00001 on every dataset run.',
    impact: 'Prevented researchers from generating multiple cohorts without resetting SQLite.',
    recommended_correction:
      'Namespace customer_code and account_number per dataset ID while preserving PRNG draw order.',
    remediation_status: 'APPROVED_FOR_MANUAL_PATCH',
    reviewer_decision_notes: 'Applied and verified by SYNTH-005 regression pass.',
    proposed_patch_json: JSON.stringify({
      impacted_files: ['backend/src/generator/engine.rs'],
      minimal_patch_diff:
        '--- a/backend/src/generator/engine.rs\n+++ b/backend/src/generator/engine.rs\n@@ -371,1 +371,1 @@\n- customer_code: format!("CUST-{:05}", i + 1)\n+ customer_code: format!("CUST-{}-{:05}", cohort_tag, i + 1)',
      regression_risk: 'LOW — Maintains ChaCha8 PRNG sequence.',
      rollback_instructions: 'Revert engine.rs customer_code & account_number formatting.',
    }),
    created_at: '2026-11-04T12:32:12Z',
  },
  {
    id: 'fnd-mon-002',
    run_id: '5bc9735a-5123-40d6-bef8-c6783931cb57',
    test_id: 'MON-002',
    finding_code: 'FND-MON-002',
    title: 'Dynamic Monitoring INCOME_DROP & EXPENSE_SURGE Transaction Scaling (Resolved in v2.1)',
    affected_feature: 'Dynamic Risk Monitoring — Behavioral Stress Simulation',
    module_id: 'M09',
    severity: 'CRITICAL',
    classification: 'CONFIRMED_DEFECT',
    confidence_level: 'HIGH',
    expected_behavior:
      'Simulating INCOME_DROP or EXPENSE_SURGE must mutate underlying bank_transactions so FeatureCalculator recomputes cash flow and pd_delta > 0.',
    actual_behavior:
      'Resolved: monitoring.rs now scales CREDIT/DEBIT bank_transactions and logs REASSESSMENT_TRIGGERED to audit_logs.',
    root_cause_analysis:
      'Previously monitoring.rs only mutated synthetic_customers columns which FeatureCalculator ignored when bank_transactions existed.',
    impact: 'Masked income and expense stress shocks in Dynamic Monitoring.',
    recommended_correction: 'Update bank_transactions amounts proportionally before recomputing features.',
    remediation_status: 'APPROVED_FOR_MANUAL_PATCH',
    reviewer_decision_notes: 'Verified by MON-001 and MON-002 positive PD delta checks.',
    proposed_patch_json: JSON.stringify({
      impacted_files: ['backend/src/api/monitoring.rs'],
      minimal_patch_diff:
        '--- a/backend/src/api/monitoring.rs\n+++ b/backend/src/api/monitoring.rs\n+ UPDATE bank_transactions SET amount = amount * ? WHERE customer_id = ? AND direction = ?',
      regression_risk: 'LOW — Directly aligns stress simulation with transaction-derived features.',
      rollback_instructions: 'Revert transaction scaling SQL statements in monitoring.rs.',
    }),
    created_at: '2026-11-04T12:32:12Z',
  },
  {
    id: 'fnd-shap-003',
    run_id: '5bc9735a-5123-40d6-bef8-c6783931cb57',
    test_id: 'PY-SHAP-003',
    finding_code: 'FND-SHAP-003',
    title: 'XGBoost Native C++ TreeSHAP pred_contribs & Probability-Space Normalization (Resolved in v2.1)',
    affected_feature: 'Explainable AI Workspace — XGBoost & LightGBM TreeSHAP',
    module_id: 'M06',
    severity: 'HIGH',
    classification: 'CONFIRMED_DEFECT',
    confidence_level: 'HIGH',
    expected_behavior:
      'XGBoost must compute exact non-zero TreeSHAP values and align probability-space scaling with ShapWaterfall.tsx.',
    actual_behavior:
      'Resolved: explainer.py uses native xgb.DMatrix pred_contribs=True and exact probability-space additive scaling with dynamic mean(|SHAP|) global importance.',
    root_cause_analysis:
      'XGBoost >= 2.0 bracketed base_score string caused shap.TreeExplainer ValueError fallback to zeros.',
    impact: 'Restores full exact explainability across LightGBM, XGBoost, and Baseline_LogReg.',
    recommended_correction: 'Use booster.predict(xgb.DMatrix(X), pred_contribs=True) natively.',
    remediation_status: 'APPROVED_FOR_MANUAL_PATCH',
    reviewer_decision_notes: 'Verified by PY-SHAP-001, PY-SHAP-002, PY-SHAP-003, and UI-001.',
    proposed_patch_json: JSON.stringify({
      impacted_files: ['ml_service/app/xai/explainer.py', 'frontend/src/components/ShapWaterfall.tsx'],
      minimal_patch_diff:
        '--- a/ml_service/app/xai/explainer.py\n+++ b/ml_service/app/xai/explainer.py\n+ contribs = model.get_booster().predict(xgb.DMatrix(X), pred_contribs=True)[0]',
      regression_risk: 'LOW — Exact TreeSHAP in C++ with probability additivity.',
      rollback_instructions: 'Revert explainer.py and ShapWaterfall.tsx.',
    }),
    created_at: '2026-11-04T12:32:12Z',
  },
];

export const MOCK_QA_TEST_CASES = [
  { id: 'tc-1', test_id: 'SMOKE-001', suite_mode: 'smoke_test', module_id: 'M12', module_name: 'System Settings & Overview', title: 'Rust Backend Health & Overview Readiness Smoke Check', status: 'PASS', duration_ms: 14, assertion_text: 'assert status == 200 && health.status == "HEALTHY"', input_json: '{"endpoints":["/api/health","/api/overview"]}', expected_json: '{"status":"HEALTHY"}', actual_json: '{"status":"HEALTHY"}', source_refs: 'backend/src/api/system.rs', commit_sha: 'remediated-v2.1', logs: 'Verified Rust Axum router health & overview endpoints.' },
  { id: 'tc-2', test_id: 'SYNTH-001', suite_mode: 'synthetic_data_validation', module_id: 'M01', module_name: 'Synthetic Data Laboratory', title: 'ChaCha8 PRNG Determinism & Seed Sensitivity Verification', status: 'PASS', duration_ms: 118, assertion_text: 'assert exact_match && diff_seed_varies', input_json: '{"seed_a":42,"seed_b":42,"seed_c":999}', expected_json: '{"same_seed_identical":true}', actual_json: '{"same_seed_identical":true}', source_refs: 'backend/src/generator/engine.rs', commit_sha: 'remediated-v2.1', logs: 'ChaCha8Rng determinism verified across 50 customers and 6M transaction series.' },
  { id: 'tc-3', test_id: 'SYNTH-005', suite_mode: 'synthetic_data_validation', module_id: 'M01', module_name: 'Synthetic Data Laboratory', title: 'Multi-Dataset Generation Persistence Without Unique Constraint Collision', status: 'PASS', duration_ms: 42, assertion_text: 'assert http_status == 200 && response.status == "SUCCESS"', input_json: '{"random_seed":101,"customer_count":20}', expected_json: '{"http_status":200}', actual_json: '{"http_status":200,"status":"SUCCESS"}', source_refs: 'backend/src/generator/engine.rs', commit_sha: 'remediated-v2.1', logs: 'Multi-cohort generation succeeded without UNIQUE constraint collisions.' },
  { id: 'tc-4', test_id: 'FEAT-002', suite_mode: 'feature_engineering_validation', module_id: 'M03', module_name: 'Feature Engineering', title: 'Zero-Denominator Safety & Empty Utility Missing-Value Policy (neutral_0.5)', status: 'PASS', duration_ms: 2, assertion_text: 'assert all_finite && utility_regularity_score == 0.5', input_json: '{"utilities":[]}', expected_json: '{"utility_regularity_score":0.5}', actual_json: '{"utility_regularity_score":0.5}', source_refs: 'backend/src/features/calculator.rs', commit_sha: 'remediated-v2.1', logs: 'Empty utility history returns neutral 0.5 policy with zero NaN/Inf.' },
  { id: 'tc-5', test_id: 'FEAT-003', suite_mode: 'feature_engineering_validation', module_id: 'M03', module_name: 'Feature Engineering', title: 'Dedicated Feature Engineering UI Module Inventory Check', status: 'PASS', duration_ms: 1, assertion_text: 'assert dedicated_frontend_route_exists == true', input_json: '{"expected_module":"Feature Engineering"}', expected_json: '{"dedicated_frontend_route_exists":true}', actual_json: '{"dedicated_frontend_route_exists":true}', source_refs: 'frontend/src/pages/FeatureEngineeringPage.tsx', commit_sha: 'remediated-v2.1', logs: 'Dedicated Feature Engineering route & catalog verified in Sidebar.tsx and App.tsx.' },
  { id: 'tc-6', test_id: 'API-001', suite_mode: 'rust_api_test', module_id: 'M02', module_name: 'Synthetic Customer Explorer', title: 'Customer Explorer Parameterized Filter & Pagination Total Consistency', status: 'PASS', duration_ms: 6, assertion_text: 'assert filtered_customers_count == pagination.total', input_json: '{"cohort":"Group_A","profile":"Stable Income"}', expected_json: '{"pagination_matches_filter":true}', actual_json: '{"pagination_matches_filter":true}', source_refs: 'backend/src/api/customers.rs', commit_sha: 'remediated-v2.1', logs: 'QueryBuilder parameterized filters and filtered COUNT(*) verified.' },
  { id: 'tc-7', test_id: 'API-003', suite_mode: 'ml_training_evaluation_test', module_id: 'M05', module_name: 'Model Research Laboratory', title: 'Rust POST /api/models/train Execution & Artifact Serialization Audit', status: 'PASS', duration_ms: 312, assertion_text: 'assert artifact_created && !metrics_identical', input_json: '{"algorithm":"LightGBM","seeds":[42,9999]}', expected_json: '{"artifact_created":true}', actual_json: '{"artifact_created":true,"metrics_respond_to_seed":true}', source_refs: 'backend/src/api/models.rs', commit_sha: 'remediated-v2.1', logs: 'Delegated training to ML engine, serialized .joblib artifact, and logged model_experiments.' },
  { id: 'tc-8', test_id: 'MON-002', suite_mode: 'dynamic_risk_monitoring_test', module_id: 'M09', module_name: 'Dynamic Risk Monitoring', title: 'INCOME_DROP & EXPENSE_SURGE Feature Recalculation and PD Delta Verification', status: 'PASS', duration_ms: 185, assertion_text: 'assert income_drop_pd_delta > 0 && expense_surge_pd_delta > 0', input_json: '{"income_drop_pct":50,"expense_surge_pct":60}', expected_json: '{"pd_delta_gt_0":true}', actual_json: '{"income_drop_pd_delta":0.142,"expense_surge_pd_delta":0.098}', source_refs: 'backend/src/api/monitoring.rs', commit_sha: 'remediated-v2.1', logs: 'Transaction scaling updated cash-flow features and produced positive PD deltas.' },
  { id: 'tc-9', test_id: 'PY-NLP-001', suite_mode: 'nlp_classification_test', module_id: 'M04', module_name: 'Transaction NLP Intelligence', title: 'Held-Out Bilingual 11-Category Classification (>= 94.5% Accuracy)', status: 'PASS', duration_ms: 140, assertion_text: 'assert overlap_count == 0 and held_out_accuracy >= 0.945', input_json: '{"held_out_sample_count":55}', expected_json: '{"held_out_accuracy":">=0.945"}', actual_json: '{"held_out_accuracy":0.9636,"overlap":0}', source_refs: 'ml_service/app/nlp/classifier.py', commit_sha: 'remediated-v2.1', logs: 'Word+Char FeatureUnion TF-IDF achieved >=94.5% held-out accuracy with 0 overlap.' },
  { id: 'tc-10', test_id: 'PY-SHAP-003', suite_mode: 'shap_xai_validation', module_id: 'M06', module_name: 'Model Benchmark Comparison & XAI', title: 'XGBoost Native TreeSHAP Non-Zero Attribution Verification', status: 'PASS', duration_ms: 21, assertion_text: 'assert xgb_nonzero_contributions > 0', input_json: '{"model":"XGBoost"}', expected_json: '{"nonzero_shap_contributions":">0"}', actual_json: '{"nonzero_shap_contributions":12}', source_refs: 'ml_service/app/xai/explainer.py', commit_sha: 'remediated-v2.1', logs: 'Native XGBoost pred_contribs produced 12 valid probability-scaled TreeSHAP attributions.' },
  { id: 'tc-11', test_id: 'PY-PSI-002', suite_mode: 'psi_drift_validation', module_id: 'M10', module_name: 'PSI Data Drift Surveillance', title: 'PSI Numerical Stability Under NaN Values', status: 'PASS', duration_ms: 4, assertion_text: 'assert abs(nan_shifted_psi - clean_shifted_psi) < 0.05', input_json: '{"baseline_nan_count":1}', expected_json: '{"status":"SIGNIFICANT_DRIFT"}', actual_json: '{"psi":1.4323,"status":"SIGNIFICANT_DRIFT"}', source_refs: 'ml_service/app/monitoring/drift.py', commit_sha: 'remediated-v2.1', logs: 'np.isfinite filtering preserved accurate SIGNIFICANT_DRIFT detection under NaN inputs.' },
  { id: 'tc-12', test_id: 'UI-E2E-009', suite_mode: 'frontend_functional', module_id: 'M12', module_name: 'Autonomous QA & Audit Center', title: 'Playwright Full-Stack & Vercel Showcase Mode E2E Verification', status: 'PASS', duration_ms: 2450, assertion_text: 'assert console_errors == 0 && nan_count == 0', input_json: '{"modes":["full-stack","showcase"]}', expected_json: '{"console_errors":0,"failed_requests":0}', actual_json: '{"console_errors":0,"failed_requests":0}', source_refs: 'frontend/e2e/run_playwright_audit.mjs', commit_sha: 'remediated-v2.1', logs: 'All 14 platform modules verified in Headless Chromium with 0 console errors.' },
];
